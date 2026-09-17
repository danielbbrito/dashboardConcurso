import sqlite3

import pandas as pd
import pytest


@pytest.fixture
def repo_db(tmp_path, monkeypatch):
    import src.db as db

    monkeypatch.setattr(db, "DB_PATH", str(tmp_path / "test.db"))
    db.init_db()
    return db


def test_init_idempotente(repo_db):
    import src.db as db
    from src import repository

    db.init_db()
    db.init_db()
    with db.get_conn() as conn:
        n = conn.execute("SELECT COUNT(*) FROM disciplinas").fetchone()[0]
        tabelas = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    assert n == 10
    assert {"disciplinas", "registros", "anotacoes"} <= tabelas
    assert len(repository.list_disciplinas()) == 10


def test_insert_e_list(repo_db):
    from src import repository

    repository.insert_registro("2026-08-17", 1, 10, 8, 2, 1)
    df = repository.list_registros()
    assert len(df) == 1
    row = df.iloc[0]
    assert row["data"] == "2026-08-17"
    assert row["disciplina_id"] == 1
    assert row["feitas"] == 10
    assert row["acertos"] == 8
    assert row["chutes"] == 2
    assert row["chutes_certos"] == 1
    assert row["nome"] == "Língua Portuguesa"


def test_filtros(repo_db):
    from src import repository

    repository.insert_registro("2026-08-01", 1, 5, 4, 0, 0)
    repository.insert_registro("2026-08-10", 2, 6, 5, 1, 0)
    repository.insert_registro("2026-08-20", 3, 7, 6, 2, 1)
    df = repository.list_registros(inicio="2026-08-02", fim="2026-08-15")
    assert len(df) == 1
    assert df.iloc[0]["disciplina_id"] == 2
    df = repository.list_registros(disciplina_ids=[1, 3])
    assert set(df["disciplina_id"]) == {1, 3}
    df = repository.list_registros(inicio="2026-08-01", fim="2026-08-01")
    assert len(df) == 1


def test_delete(repo_db):
    from src import repository

    repository.insert_registro("2026-08-17", 1, 10, 8, 2, 1)
    rid = repository.list_registros().iloc[0]["id"]
    repository.delete_registro(rid)
    assert repository.list_registros().empty
    repository.delete_registro(9999)


def test_check_constraint(repo_db):
    from src import repository

    with pytest.raises(sqlite3.IntegrityError):
        repository.insert_registro("2026-08-17", 1, 10, 11, 0, 0)


def test_anotacoes_upsert(repo_db):
    from src import repository

    repository.save_anotacao(1, "texto v1")
    repository.save_anotacao(1, "texto v2")
    assert repository.get_anotacao(1) == "texto v2"
    assert repository.get_anotacao_atualizado_em(1) is not None
    with repo_db.get_conn() as conn:
        n = conn.execute("SELECT COUNT(*) FROM anotacoes").fetchone()[0]
    assert n == 1


def test_agg_por_disciplina(repo_db):
    from src import repository

    repository.insert_registro("2026-08-01", 1, 10, 8, 2, 1)
    repository.insert_registro("2026-08-02", 1, 5, 2, 1, 0)
    repository.insert_registro("2026-08-03", 2, 20, 10, 5, 2)
    df = repository.agg_por_disciplina()
    assert len(df) == 2
    l1 = df[df["disciplina_id"] == 1].iloc[0]
    assert l1["feitas"] == 15
    assert l1["acertos"] == 10
    assert l1["nome"] == "Língua Portuguesa"
    assert l1["bloco"] == "basico"


def test_horas_insert_list_delete(repo_db):
    from src import repository

    repository.insert_horas("2026-08-17", 2.5)
    repository.insert_horas("2026-08-17", 1.0)
    df = repository.list_horas()
    assert len(df) == 2
    assert df["horas"].sum() == pytest.approx(3.5)
    agg = repository.agg_horas_por_dia()
    assert len(agg) == 1
    assert agg.iloc[0]["horas"] == pytest.approx(3.5)
    repository.delete_horas(int(df.iloc[0]["id"]))
    assert len(repository.list_horas()) == 1


def test_agg_horas_filtro(repo_db):
    from src import repository

    repository.insert_horas("2026-08-01", 2.0)
    repository.insert_horas("2026-08-10", 3.5)
    df = repository.agg_horas_por_dia(inicio="2026-08-05", fim="2026-08-15")
    assert len(df) == 1
    assert df.iloc[0]["horas"] == pytest.approx(3.5)
    df = repository.list_horas(inicio="2026-08-05", fim="2026-08-15")
    assert len(df) == 1


def test_horas_check_constraint(repo_db):
    from src import repository

    with pytest.raises(sqlite3.IntegrityError):
        repository.insert_horas("2026-08-17", 0)
    with pytest.raises(sqlite3.IntegrityError):
        repository.insert_horas("2026-08-17", 25)


def test_validar_horas():
    from datetime import date, timedelta

    from src import repository

    hoje = date.today()
    assert repository.validar_horas(hoje, 2.5) == []
    assert repository.validar_horas(hoje + timedelta(days=1), 2) == [
        "A data não pode ser no futuro."
    ]
    assert repository.validar_horas(hoje, 0) == ["As horas devem ser maiores que zero."]
    assert repository.validar_horas(hoje, 25) == [
        "As horas de um dia não podem passar de 24."
    ]
    assert repository.validar_horas(None, 2) == ["Informe uma data."]
    assert repository.validar_horas(hoje, None) == ["Informe as horas estudadas."]


def test_ciclo_ordem_preserva_horas(repo_db):
    from src import repository

    assert repository.list_ciclo() == []
    repository.save_ciclo_ordem([3, 1, 2])
    ciclo = repository.list_ciclo()
    assert [c["id"] for c in ciclo] == [3, 1, 2]
    assert ciclo[0]["nome"] == "Direito Administrativo"
    assert ciclo[0]["bloco"] == "basico"
    assert ciclo[0]["horas"] == 1.0

    repository.save_ciclo_horas({1: 6.0, 2: 3.0, 3: 4.5})
    repository.save_ciclo_ordem([1, 3, 2])
    ciclo = repository.list_ciclo()
    assert [c["id"] for c in ciclo] == [1, 3, 2]
    assert {c["id"]: c["horas"] for c in ciclo} == {1: 6.0, 3: 4.5, 2: 3.0}


def test_ciclo_horas_upsert(repo_db):
    from src import repository

    repository.save_ciclo_horas({1: 5.0, 2: 2.5}, ordem_default=[1, 2, 3])
    ciclo = repository.list_ciclo()
    assert [c["id"] for c in ciclo] == [1, 2]
    assert {c["id"]: c["horas"] for c in ciclo} == {1: 5.0, 2: 2.5}

    repository.save_ciclo_horas({1: 6.0}, ordem_default=[1])
    assert repository.list_ciclo()[0]["horas"] == 6.0


def test_ciclo_migracao_coluna_horas(tmp_path, monkeypatch):
    import sqlite3

    import src.db as db

    path = tmp_path / "mig.db"
    conn = sqlite3.connect(str(path))
    conn.execute(
        "CREATE TABLE ciclo_estudos ("
        " id INTEGER PRIMARY KEY,"
        " posicao INTEGER NOT NULL UNIQUE,"
        " disciplina_id INTEGER NOT NULL UNIQUE REFERENCES disciplinas(id))"
    )
    conn.execute("INSERT INTO ciclo_estudos (posicao, disciplina_id) VALUES (1, 1)")
    conn.commit()
    conn.close()

    monkeypatch.setattr(db, "DB_PATH", str(path))
    db.init_db()
    with db.get_conn() as c:
        colunas = {r[1] for r in c.execute("PRAGMA table_info(ciclo_estudos)")}
        horas = c.execute(
            "SELECT horas FROM ciclo_estudos WHERE disciplina_id = 1"
        ).fetchone()[0]
    assert "horas" in colunas
    assert horas == 1.0


def test_migracao_colunas_registros(tmp_path, monkeypatch):
    import sqlite3

    import src.db as db

    path = tmp_path / "mig.db"
    conn = sqlite3.connect(str(path))
    conn.execute(
        "CREATE TABLE registros ("
        " id INTEGER PRIMARY KEY,"
        " data TEXT NOT NULL,"
        " disciplina_id INTEGER NOT NULL,"
        " feitas INTEGER NOT NULL,"
        " acertos INTEGER NOT NULL,"
        " chutes INTEGER NOT NULL DEFAULT 0,"
        " chutes_certos INTEGER NOT NULL DEFAULT 0,"
        " criado_em TEXT NOT NULL DEFAULT (datetime('now')))"
    )
    conn.execute(
        "INSERT INTO registros (data, disciplina_id, feitas, acertos) VALUES ('2026-08-17', 1, 10, 8)"
    )
    conn.commit()
    conn.close()

    monkeypatch.setattr(db, "DB_PATH", str(path))
    db.init_db()
    with db.get_conn() as c:
        colunas = {r[1] for r in c.execute("PRAGMA table_info(registros)")}
        linha = c.execute("SELECT dificuldade, materia, submateria FROM registros").fetchone()
    assert {"dificuldade", "materia", "submateria"} <= colunas
    assert tuple(linha) == (None, None, None)


def test_insert_registro_com_extras(repo_db):
    from src import repository

    repository.insert_registro(
        "2026-08-17", 1, 10, 8, 2, 1, "Difícil", "Domínio da ortografia oficial"
    )
    df = repository.list_registros()
    row = df.iloc[0]
    assert row["dificuldade"] == "Difícil"
    assert row["materia"] == "Domínio da ortografia oficial"
    assert row["submateria"] is None or pd.isna(row["submateria"])

    repository.insert_registro(
        "2026-08-18", 1, 6, 5, 0, 0, "Fácil", "Reescrita de frases e parágrafos do texto",
        "Significação das palavras",
    )
    df = repository.list_registros()
    assert len(df) == 2
    assert df.iloc[0]["submateria"] == "Significação das palavras"
    assert df.iloc[0]["materia"] == "Reescrita de frases e parágrafos do texto"


def test_agg_por_materia(repo_db):
    from src import repository

    repository.insert_registro("2026-08-01", 1, 10, 8, 0, 0, "Fácil", "A")
    repository.insert_registro("2026-08-02", 1, 5, 2, 0, 0, "Difícil", "A")
    repository.insert_registro("2026-08-03", 1, 8, 7, 0, 0, "Fácil", "A", "sub-1")
    repository.insert_registro("2026-08-04", 2, 8, 7, 0, 0, "Fácil", "B")
    repository.insert_registro("2026-08-05", 1, 4, 2, 0, 0, "Médio", "Simulado")

    agg = repository.agg_por_materia()
    assert len(agg) == 3
    linha_a = agg[agg["materia"] == "A"].iloc[0]
    assert linha_a["disciplina"] == "Língua Portuguesa"
    assert linha_a["feitas"] == 23
    assert linha_a["acertos"] == 17
    assert linha_a["n_sessoes"] == 3
    assert linha_a["dificuldade_media"] == pytest.approx((2 + 4 + 2) / 3)

    agg_sub = repository.agg_por_materia(por_submateria=True)
    assert len(agg_sub) == 4
    assert agg_sub["submateria"].notna().sum() == 1
    assert "sub-1" in agg_sub["submateria"].tolist()

    agg_filtro = repository.agg_por_materia(disciplina_ids=[2])
    assert len(agg_filtro) == 1
    assert agg_filtro.iloc[0]["materia"] == "B"

    assert repository.agg_por_materia()["materia"].tolist() == ["A", "Simulado", "B"]


def test_agg_por_dificuldade(repo_db):
    from src import repository

    repository.insert_registro("2026-08-01", 1, 10, 8, 0, 0, "Fácil", "A")
    repository.insert_registro("2026-08-02", 1, 5, 2, 0, 0, "Difícil", "A")
    repository.insert_registro("2026-08-03", 2, 8, 7, 0, 0, "Fácil", "B")
    repository.insert_registro("2026-08-04", 1, 6, 3, 0, 0, "Médio", "Simulado")
    repository.insert_registro("2026-08-05", 1, 4, 2, 0, 0)

    agg = repository.agg_por_dificuldade()
    assert len(agg) == 3
    facil = agg[agg["dificuldade"] == "Fácil"].iloc[0]
    assert facil["feitas"] == 18
    assert facil["acertos"] == 15
    assert facil["n_sessoes"] == 2
    dificil = agg[agg["dificuldade"] == "Difícil"].iloc[0]
    assert dificil["dificuldade_num"] == 4
    assert agg[agg["dificuldade"] == "Médio"].iloc[0]["dificuldade_num"] == 3


def test_materias_edital_catalogo():
    from src.materias_edital import MATERIAS_POR_DISCIPLINA, materias_de, submaterias_de
    from src.seed import DISCIPLINAS

    nomes_seed = {n for n, *_ in DISCIPLINAS}
    assert set(MATERIAS_POR_DISCIPLINA) == nomes_seed
    assert "Simulado" not in materias_de("Língua Portuguesa")
    assert submaterias_de("Língua Portuguesa", "Domínio da ortografia oficial") == []
    assert "Emprego do sinal indicativo de crase" in submaterias_de(
        "Língua Portuguesa", "Domínio da estrutura morfossintática do período"
    )
    assert submaterias_de("Língua Portuguesa", "Inexistente") == []


def test_validar_registro():
    from datetime import date, timedelta

    from src import repository

    hoje = date.today()
    assert repository.validar_registro(hoje, 10, 8, 2, 1, "Médio") == []
    assert repository.validar_registro(hoje + timedelta(days=1), 10, 8, 2, 1, "Médio") == [
        "A data não pode ser no futuro."
    ]
    assert repository.validar_registro(hoje, 0, 0, 0, 0, "Médio") == [
        "Informe pelo menos 1 questão feita."
    ]
    assert repository.validar_registro(hoje, 10, 11, 0, 0, "Médio") == [
        "Acertos deve estar entre 0 e o total de questões."
    ]
    assert repository.validar_registro(hoje, 10, 8, 3, 4, "Médio") == [
        "Chutes certos não pode ser maior que os chutes nem que os acertos."
    ]
    assert repository.validar_registro(hoje, 10.5, 8, 2, 1, "Médio") == ["Use apenas números inteiros."]
    assert repository.validar_registro(hoje, 10, 8, 2, 1) == [
        "Informe a dificuldade percebida da sessão."
    ]
    assert repository.validar_registro(hoje, 10, 8, 2, 1, "Impossível") == [
        "Informe a dificuldade percebida da sessão."
    ]


def test_materia_insert_list_delete(repo_db):
    from src import repository

    repository.insert_materia("2026-08-17", 1, "Denotação e conotação", "Funções da linguagem")
    repository.insert_materia("2026-08-18", 1, "Crase")
    df = repository.list_materias()
    assert len(df) == 2
    row = df.iloc[0]
    assert row["data"] == "2026-08-18"
    assert row["disciplina_id"] == 1
    assert row["nome"] == "Língua Portuguesa"
    assert row["bloco"] == "basico"
    assert row["materia"] == "Crase"
    assert pd.isna(row["submateria"])
    repository.delete_materia(int(row["id"]))
    assert len(repository.list_materias()) == 1
    repository.delete_materia(9999)


def test_materia_filtros(repo_db):
    from src import repository

    repository.insert_materia("2026-08-01", 1, "A")
    repository.insert_materia("2026-08-10", 2, "B")
    df = repository.list_materias(inicio="2026-08-05", fim="2026-08-31")
    assert len(df) == 1
    assert df.iloc[0]["materia"] == "B"
    df = repository.list_materias(disciplina_ids=[1])
    assert len(df) == 1
    assert df.iloc[0]["materia"] == "A"
    df = repository.list_materias(limit=1)
    assert len(df) == 1


def test_validar_materia():
    from datetime import date, timedelta

    from src import repository

    hoje = date.today()
    assert repository.validar_materia(hoje, "  Denotação  ") == []
    assert repository.validar_materia(hoje + timedelta(days=1), "A") == [
        "A data não pode ser no futuro."
    ]
    assert repository.validar_materia(hoje, "") == ["Informe a matéria estudada."]
    assert repository.validar_materia(hoje, "   ") == ["Informe a matéria estudada."]
    assert repository.validar_materia(hoje, None) == ["Informe a matéria estudada."]
    assert repository.validar_materia(None, "A") == ["Informe uma data."]