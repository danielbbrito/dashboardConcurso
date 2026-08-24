from datetime import date

import pandas as pd

from src import revisoes


def test_revisoes_de():
    d = date(2026, 8, 24)
    assert revisoes.revisoes_de(d) == [
        ("24h", date(2026, 8, 25)),
        ("7 dias", date(2026, 8, 31)),
        ("30 dias", date(2026, 9, 23)),
    ]


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
    assert len(out) == 3
    assert list(out["tipo"]) == ["24h", "7 dias", "30 dias"]
    assert list(out["marca"]) == ["1d", "7d", "30d"]
    assert list(out["data_revisao"]) == ["2026-08-25", "2026-08-31", "2026-09-23"]
    row = out.iloc[0]
    assert row["disciplina"] == "Língua Portuguesa"
    assert row["materia"] == "Crase"
    assert row["data_estudo"] == "2026-08-24"


def test_mapa_revisoes():
    mapa = revisoes.mapa_revisoes(_df_um_registro())
    assert set(mapa.keys()) == {"2026-08-25", "2026-08-31", "2026-09-23"}
    assert {r["tipo"] for r in mapa["2026-08-25"]} == {"24h"}
    assert mapa["2026-09-23"][0]["materia"] == "Crase"


def test_mapa_estudos():
    mapa = revisoes.mapa_estudos(_df_um_registro())
    assert list(mapa.keys()) == ["2026-08-24"]
    assert mapa["2026-08-24"][0]["materia"] == "Crase"


def test_mapa_agrupa_mesmo_dia():
    df = pd.concat([_df_um_registro()] * 2)
    df["id"] = [1, 2]
    mapa = revisoes.mapa_revisoes(df)
    assert len(mapa["2026-08-25"]) == 2
