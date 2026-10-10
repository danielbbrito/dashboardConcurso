from datetime import date

import pandas as pd

from src import revisoes


def test_revisoes_de():
    assert revisoes.revisoes_de(date(2026, 8, 24)) == [("Semanal", date(2026, 8, 29))]
    assert revisoes.revisoes_de(date(2026, 8, 30)) == [("Semanal", date(2026, 9, 5))]
    assert revisoes.revisoes_de(date(2026, 8, 29)) == [("Semanal", date(2026, 8, 29))]


def _df_um_registro():
    return pd.DataFrame(
        [
            {
                "id": 1,
                "data": "2026-08-24",
                "disciplina_id": 1,
                "nome": "Língua Portuguesa",
                "bloco": "basico",
                "materia": "Crase",
                "submateria": None,
                "criado_em": "2026-08-24 10:00:00",
            }
        ]
    )


def test_expandir():
    out = revisoes.expandir(_df_um_registro())
    assert len(out) == 1
    assert list(out["tipo"]) == ["Semanal"]
    assert list(out["marca"]) == ["Sáb"]
    assert list(out["data_revisao"]) == ["2026-08-29"]
    row = out.iloc[0]
    assert row["disciplina"] == "Língua Portuguesa"
    assert row["materia"] == "Crase"
    assert row["data_estudo"] == "2026-08-24"


def test_mapa_revisoes():
    mapa = revisoes.mapa_revisoes(_df_um_registro())
    assert set(mapa.keys()) == {"2026-08-29"}
    assert {r["tipo"] for r in mapa["2026-08-29"]} == {"Semanal"}
    assert mapa["2026-08-29"][0]["materia"] == "Crase"


def test_mapa_estudos():
    mapa = revisoes.mapa_estudos(_df_um_registro())
    assert list(mapa.keys()) == ["2026-08-24"]
    assert mapa["2026-08-24"][0]["materia"] == "Crase"


def test_mapa_agrupa_mesmo_dia():
    df = pd.concat([_df_um_registro()] * 2)
    df["id"] = [1, 2]
    mapa = revisoes.mapa_revisoes(df)
    assert len(mapa["2026-08-29"]) == 2


def test_inicio_semana_comeca_no_domingo():
    assert revisoes.inicio_semana(date(2026, 8, 30)) == date(2026, 8, 30)
    assert revisoes.inicio_semana(date(2026, 8, 31)) == date(2026, 8, 30)
    assert revisoes.inicio_semana(date(2026, 9, 5)) == date(2026, 8, 30)


def test_revisoes_na_semana_inclui_domingo_a_sabado():
    df = pd.concat([_df_um_registro()] * 3, ignore_index=True)
    df["id"] = [1, 2, 3]
    df["data"] = ["2026-08-30", "2026-09-05", "2026-09-06"]

    semana = revisoes.revisoes_na_semana(df, date(2026, 8, 30))

    assert list(semana["data_estudo"]) == ["2026-08-30", "2026-09-05"]
    assert list(semana["data_revisao"]) == ["2026-09-05", "2026-09-05"]
    assert list(semana["materia"]) == ["Crase", "Crase"]
    assert len(revisoes.revisoes_na_semana(df, date(2026, 9, 6))) == 1


def test_revisoes_na_semana_vazia_mantem_colunas():
    semana = revisoes.revisoes_na_semana(_df_um_registro(), date(2026, 9, 6))

    assert semana.empty
    assert "data_revisao" in semana.columns
