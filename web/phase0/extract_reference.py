"""Capture a deterministic, privacy-preserving Phase 0 reference snapshot."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import sqlite3
from collections import defaultdict
from datetime import date, timedelta
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
DEFAULT_SOURCE = ROOT / "data" / "estudos.db"
DEFAULT_COPY = HERE / ".reference" / "estudos-reference.sqlite3"
MANIFEST_PATH = HERE / "reference-manifest.json"
FIXTURES_PATH = HERE / "reference-fixtures.json"


def connect_read_only(path: Path) -> sqlite3.Connection:
    uri = f"file:{path.resolve()}?mode=ro"
    return sqlite3.connect(uri, uri=True)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(value, handle, ensure_ascii=True, indent=2, sort_keys=True)
        handle.write("\n")


def copy_database(source: Path, target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists():
        target.chmod(0o600)
        target.unlink()
    with connect_read_only(source) as source_conn:
        with sqlite3.connect(target) as target_conn:
            source_conn.backup(target_conn)
    target.chmod(0o444)


def rows(conn: sqlite3.Connection, sql: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
    conn.row_factory = sqlite3.Row
    return [dict(row) for row in conn.execute(sql, params).fetchall()]


def table_columns(conn: sqlite3.Connection, table: str) -> list[str]:
    return [row[1] for row in conn.execute(f"PRAGMA table_info({table})").fetchall()]


def null_if_zero(value: int | float, denominator: int | float) -> float | None:
    return value / denominator if denominator else None


def kpis(question_rows: list[dict[str, Any]]) -> dict[str, int | float | None]:
    feitas = sum(int(row["feitas"]) for row in question_rows)
    acertos = sum(int(row["acertos"]) for row in question_rows)
    chutes = sum(int(row["chutes"]) for row in question_rows)
    chutes_certos = sum(int(row["chutes_certos"]) for row in question_rows)
    erros = feitas - acertos
    acertos_sem_chute = acertos - chutes_certos
    nota = acertos - 0.5 * erros
    return {
        "feitas": feitas,
        "acertos": acertos,
        "erros": erros,
        "chutes": chutes,
        "chutes_certos": chutes_certos,
        "chutes_errados": chutes - chutes_certos,
        "acertos_sem_chute": acertos_sem_chute,
        "taxa_acerto": null_if_zero(acertos, feitas),
        "taxa_acerto_seguro": null_if_zero(acertos_sem_chute, feitas),
        "taxa_acerto_nao_chutadas": null_if_zero(acertos_sem_chute, feitas - chutes),
        "pct_chutes": null_if_zero(chutes, feitas),
        "taxa_chute_certo": null_if_zero(chutes_certos, chutes),
        "nota_cebraspe": nota,
        "nota_cebraspe_pct": null_if_zero(nota, feitas),
    }


def daily_series(question_rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in question_rows:
        grouped[row["data"]].append(row)
    result = []
    totals = {key: 0 for key in ("feitas", "acertos", "chutes", "chutes_certos")}
    for current_date in sorted(grouped):
        values = kpis(grouped[current_date])
        for key in totals:
            totals[key] += int(values[key])
        result.append(
            {
                "data": current_date,
                "feitas": values["feitas"],
                "acertos": values["acertos"],
                "chutes": values["chutes"],
                "chutes_certos": values["chutes_certos"],
                "feitas_acum": totals["feitas"],
                "acertos_acum": totals["acertos"],
                "chutes_acum": totals["chutes"],
                "chutes_certos_acum": totals["chutes_certos"],
                "taxa_acum": null_if_zero(totals["acertos"], totals["feitas"]),
                "taxa_acum_seguro": null_if_zero(
                    totals["acertos"] - totals["chutes_certos"], totals["feitas"]
                ),
                "nota_acum": totals["acertos"] - 0.5 * (totals["feitas"] - totals["acertos"]),
            }
        )
    return result


def monday_week_start(value: str) -> date:
    parsed = date.fromisoformat(value)
    return parsed - timedelta(days=parsed.weekday())


def weekly_series(question_rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[date, list[dict[str, Any]]] = defaultdict(list)
    for row in question_rows:
        grouped[monday_week_start(row["data"])].append(row)
    result = []
    for start in sorted(grouped):
        values = kpis(grouped[start])
        result.append(
            {
                "data": start.isoformat(),
                "data_fim": (start + timedelta(days=6)).isoformat(),
                "feitas": values["feitas"],
                "acertos": values["acertos"],
                "chutes": values["chutes"],
                "chutes_certos": values["chutes_certos"],
                "taxa_semana": null_if_zero(values["acertos"], values["feitas"]),
            }
        )
    return result


def ranking(question_rows: list[dict[str, Any]], minimum: int = 0, safe: bool = False) -> list[dict[str, Any]]:
    grouped: dict[tuple[int, str, str], list[dict[str, Any]]] = defaultdict(list)
    for row in question_rows:
        grouped[(row["disciplina_id"], row["nome"], row["bloco"])].append(row)
    result = []
    for (discipline_id, name, block), group in grouped.items():
        values = kpis(group)
        if values["feitas"] < minimum:
            continue
        result.append(
            {
                "disciplina_id": discipline_id,
                "nome": name,
                "bloco": block,
                "feitas": values["feitas"],
                "acertos": values["acertos"],
                "chutes": values["chutes"],
                "chutes_certos": values["chutes_certos"],
                "taxa_acerto": values["taxa_acerto"],
                "taxa_acerto_seguro": values["taxa_acerto_seguro"],
                "nota_cebraspe": values["nota_cebraspe"],
            }
        )
    metric = "taxa_acerto_seguro" if safe else "taxa_acerto"
    return sorted(
        result,
        key=lambda row: (-float(row[metric] or 0), -row["feitas"], row["nome"]),
    )


def comparison(question_rows: list[dict[str, Any]], cutoff_a: str, cutoff_b: str) -> dict[str, Any]:
    before_a = [row for row in question_rows if row["data"] <= cutoff_a]
    before_b = [row for row in question_rows if row["data"] <= cutoff_b]
    interval = [row for row in question_rows if cutoff_a < row["data"] <= cutoff_b]
    by_discipline: dict[int, list[dict[str, Any]]] = defaultdict(list)
    for row in before_b:
        by_discipline[row["disciplina_id"]].append(row)
    result = []
    for discipline_id, group_b in by_discipline.items():
        group_interval = [row for row in interval if row["disciplina_id"] == discipline_id]
        if not group_interval:
            continue
        group_a = [row for row in before_a if row["disciplina_id"] == discipline_id]
        values_a = kpis(group_a)
        values_b = kpis(group_b)
        rate_a = values_a["taxa_acerto"]
        rate_b = values_b["taxa_acerto"]
        delta = (rate_b or 0) * 100 if rate_a is None else ((rate_b - rate_a) * 100 if rate_b is not None else None)
        sample = group_b[0]
        result.append(
            {
                "disciplina_id": discipline_id,
                "nome": sample["nome"],
                "bloco": sample["bloco"],
                "feitas_periodo": kpis(group_interval)["feitas"],
                "feitas_a": values_a["feitas"],
                "feitas_b": values_b["feitas"],
                "taxa_a": rate_a,
                "taxa_b": rate_b,
                "delta_pp": delta,
            }
        )
    return {
        "corte_a": cutoff_a,
        "corte_b": cutoff_b,
        "kpis_a": kpis(before_a),
        "kpis_b": kpis(before_b),
        "por_disciplina": sorted(result, key=lambda row: -(row["delta_pp"] or 0)),
    }


def hours_daily(hours_rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[str, float] = defaultdict(float)
    for row in hours_rows:
        grouped[row["data"]] += float(row["horas"])
    total = 0.0
    result = []
    for current_date in sorted(grouped):
        total += grouped[current_date]
        result.append({"data": current_date, "horas": grouped[current_date], "horas_acum": total})
    return result


def hours_weekly(hours_rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[date, list[dict[str, Any]]] = defaultdict(list)
    for row in hours_rows:
        grouped[monday_week_start(row["data"])].append(row)
    result = []
    for start in sorted(grouped, reverse=True):
        hours = sum(float(row["horas"]) for row in grouped[start])
        days = len({row["data"] for row in grouped[start]})
        result.append(
            {
                "semana_inicio": start.isoformat(),
                "data_fim": (start + timedelta(days=6)).isoformat(),
                "horas": hours,
                "dias": days,
                "media_dia": hours / days,
            }
        )
    return result


def topic_analytics(question_rows: list[dict[str, Any]]) -> dict[str, Any]:
    with_topics = [row for row in question_rows if row.get("topic")]
    by_topic: dict[tuple[int, str, str | None], list[dict[str, Any]]] = defaultdict(list)
    by_difficulty: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in with_topics:
        by_topic[(row["disciplina_id"], row["topic"], row.get("subtopic"))].append(row)
        by_difficulty[row["difficulty"]].append(row)

    def summary(group: list[dict[str, Any]]) -> dict[str, Any]:
        values = kpis(group)
        difficulty_total = sum(row["difficulty_value"] for row in group)
        return {
            "sessoes": len(group),
            "feitas": values["feitas"],
            "acertos": values["acertos"],
            "taxa_acerto": values["taxa_acerto"],
            "dificuldade_media": difficulty_total / len(group) if group else None,
        }

    topics = []
    for (discipline_id, topic, subtopic), group in sorted(by_topic.items()):
        item = {"disciplina_id": discipline_id, "topic": topic, "subtopic": subtopic}
        item.update(summary(group))
        topics.append(item)
    difficulties = []
    for difficulty, group in sorted(by_difficulty.items()):
        item = {"difficulty": difficulty}
        item.update(summary(group))
        difficulties.append(item)
    return {
        "sessoes_com_materia": len(with_topics),
        "questoes_com_materia": sum(int(row["feitas"]) for row in with_topics),
        "materias_distintas": len({row["topic"] for row in with_topics}),
        "por_materia": topics,
        "por_dificuldade": difficulties,
    }


def review_schedule(topic_rows: list[dict[str, Any]]) -> dict[str, Any]:
    scheduled: dict[str, int] = defaultdict(int)
    for row in topic_rows:
        study_date = date.fromisoformat(row["data"])
        review_date = study_date + timedelta(days=(5 - study_date.weekday()) % 7)
        scheduled[review_date.isoformat()] += 1
    return {"por_sabado": dict(sorted(scheduled.items()))}


def synthetic_fixtures() -> dict[str, Any]:
    def question(data: str, discipline_id: int, name: str, block: str, feitos: int, acertos: int, chutes: int, chutes_certos: int, difficulty: str = "Medio", topic: str | None = None, subtopic: str | None = None) -> dict[str, Any]:
        return {
            "data": data,
            "disciplina_id": discipline_id,
            "nome": name,
            "bloco": block,
            "feitas": feitos,
            "acertos": acertos,
            "chutes": chutes,
            "chutes_certos": chutes_certos,
            "difficulty": difficulty,
            "difficulty_value": {"Muito facil": 1, "Facil": 2, "Medio": 3, "Dificil": 4}[difficulty],
            "topic": topic,
            "subtopic": subtopic,
        }

    fixtures = {
        "empty": {"questions": [], "hours": [], "topics": []},
        "one_row": {
            "questions": [question("2026-08-01", 1, "D1", "basico", 10, 8, 2, 1)],
            "hours": [{"data": "2026-08-01", "horas": 2.5}],
            "topics": [{"data": "2026-08-01", "disciplina_id": 1, "topic": "Topico A", "subtopic": None}],
        },
        "multi_row": {
            "questions": [
                question("2026-08-01", 1, "D1", "basico", 10, 8, 2, 1, topic="Topico A"),
                question("2026-08-02", 2, "D2", "especifico", 5, 2, 1, 0, topic="Topico B"),
            ],
            "hours": [
                {"data": "2026-08-01", "horas": 2.0},
                {"data": "2026-08-01", "horas": 1.5},
                {"data": "2026-08-02", "horas": 3.0},
            ],
            "topics": [
                {"data": "2026-08-01", "disciplina_id": 1, "topic": "Topico A", "subtopic": "Sub A"},
                {"data": "2026-08-06", "disciplina_id": 2, "topic": "Topico B", "subtopic": None},
            ],
        },
        "zero_chute": {
            "questions": [question("2026-08-01", 1, "D1", "basico", 100, 60, 0, 0)],
            "hours": [],
            "topics": [],
        },
        "all_chute": {
            "questions": [question("2026-08-01", 1, "D1", "basico", 10, 5, 10, 5)],
            "hours": [],
            "topics": [],
        },
        "long_date_range": {
            "questions": [
                question("2026-01-01", 1, "D1", "basico", 10, 5, 2, 1),
                question("2026-06-15", 1, "D1", "basico", 10, 8, 2, 1),
                question("2026-12-31", 2, "D2", "especifico", 20, 14, 0, 0),
            ],
            "hours": [
                {"data": "2026-01-01", "horas": 1.5},
                {"data": "2026-06-15", "horas": 2.0},
                {"data": "2026-12-31", "horas": 4.0},
            ],
            "topics": [
                {"data": "2026-01-01", "disciplina_id": 1, "topic": "Topico A", "subtopic": None},
                {"data": "2026-12-31", "disciplina_id": 2, "topic": "Simulado", "subtopic": None},
            ],
        },
    }
    outputs = {}
    for name, fixture in fixtures.items():
        questions = fixture["questions"]
        outputs[name] = {
            "kpis": kpis(questions),
            "daily_series": daily_series(questions),
            "weekly_series": weekly_series(questions),
            "ranking": ranking(questions),
            "ranking_safe": ranking(questions, safe=True),
            "hours_daily": hours_daily(fixture["hours"]),
            "hours_weekly": hours_weekly(fixture["hours"]),
            "topic_analytics": topic_analytics(questions),
            "review_schedule": review_schedule(fixture["topics"]),
        }
    fixtures["long_date_range"]["comparison"] = comparison(
        fixtures["long_date_range"]["questions"], "2026-06-15", "2026-12-31"
    )
    outputs["long_date_range"]["comparison"] = fixtures["long_date_range"]["comparison"]
    return {"fixture_version": 1, "fixtures": fixtures, "expected": outputs}


def source_manifest(source: Path, copy_path: Path) -> dict[str, Any]:
    with connect_read_only(source) as conn:
        table_names = [
            row[0]
            for row in conn.execute(
                "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
            ).fetchall()
        ]
        tables = {name: table_columns(conn, name) for name in table_names}
        counts = {
            name: conn.execute(f"SELECT COUNT(*) FROM {name}").fetchone()[0]
            for name in table_names
        }
        catalog = rows(conn, "SELECT id, nome, bloco, itens_prova, ordem FROM disciplinas ORDER BY ordem, id")
        discipline_names = {row["id"]: row["nome"] for row in catalog}
        question_columns = set(tables.get("registros", []))
        question_select = ["r.data", "r.disciplina_id", "r.feitas", "r.acertos", "r.chutes", "r.chutes_certos"]
        for column in ("dificuldade", "materia", "submateria"):
            if column in question_columns:
                question_select.append(f"r.{column}")
        question_rows = rows(
            conn,
            "SELECT " + ", ".join(question_select) + " FROM registros r ORDER BY r.data, r.id",
        )
        for row in question_rows:
            row["nome"] = discipline_names[row["disciplina_id"]]
            row["bloco"] = next(item["bloco"] for item in catalog if item["id"] == row["disciplina_id"])
        hours_rows = rows(conn, "SELECT data, horas FROM horas_estudo ORDER BY data, id")
        topic_rows = rows(conn, "SELECT data, disciplina_id, materia, submateria FROM materias ORDER BY data, id")
        cycle_rows = rows(
            conn,
            "SELECT posicao, disciplina_id, horas FROM ciclo_estudos ORDER BY posicao",
        )
        note_rows = rows(conn, "SELECT disciplina_id, texto FROM anotacoes ORDER BY disciplina_id")
        question_by_date = []
        for current_date in sorted({row["data"] for row in question_rows}):
            item = {"data": current_date}
            item.update(kpis([row for row in question_rows if row["data"] == current_date]))
            question_by_date.append(item)
        question_by_discipline = []
        for discipline_id in sorted({row["disciplina_id"] for row in question_rows}):
            item = {
                "disciplina_id": discipline_id,
                "nome": discipline_names[discipline_id],
            }
            item.update(kpis([row for row in question_rows if row["disciplina_id"] == discipline_id]))
            question_by_discipline.append(item)
        topic_by_date_discipline = []
        for key in sorted({(row["data"], row["disciplina_id"]) for row in topic_rows}):
            current_date, discipline_id = key
            group = [row for row in topic_rows if (row["data"], row["disciplina_id"]) == key]
            topic_by_date_discipline.append(
                {
                    "data": current_date,
                    "disciplina_id": discipline_id,
                    "nome": discipline_names[discipline_id],
                    "registros": len(group),
                    "materias_distintas": len({row["materia"] for row in group}),
                }
            )
        notes = [
            {
                "disciplina_id": row["disciplina_id"],
                "length": len(row["texto"]),
                "sha256": hashlib.sha256(row["texto"].encode("utf-8")).hexdigest(),
            }
            for row in note_rows
        ]
        return {
            "manifest_version": 1,
            "source": {
                "label": "local-sqlite",
                "relative_path": "data/estudos.db",
                "sha256": sha256_file(source),
                "copy_relative_path": os.path.relpath(copy_path, ROOT),
                "copy_sha256": sha256_file(copy_path),
            },
            "schema": tables,
            "row_counts": counts,
            "catalog": catalog,
            "question_totals": kpis(question_rows),
            "question_by_date": question_by_date,
            "question_by_discipline": question_by_discipline,
            "hours_by_date": hours_daily(hours_rows),
            "topics": {
                "total": len(topic_rows),
                "by_date_discipline": topic_by_date_discipline,
                "review_schedule": review_schedule(
                    [{"data": row["data"]} for row in topic_rows]
                ),
            },
            "notes": notes,
            "cycle": cycle_rows,
        }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--copy", dest="copy_path", type=Path, default=DEFAULT_COPY)
    args = parser.parse_args()
    source = args.source.resolve()
    copy_path = args.copy_path.resolve()
    if not source.is_file():
        raise SystemExit(f"Source database not found: {source}")
    copy_database(source, copy_path)
    write_json(MANIFEST_PATH, source_manifest(source, copy_path))
    write_json(FIXTURES_PATH, synthetic_fixtures())
    print(f"Reference copy: {copy_path}")
    print(f"Manifest: {MANIFEST_PATH}")
    print(f"Fixtures: {FIXTURES_PATH}")


if __name__ == "__main__":
    main()
