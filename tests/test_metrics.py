import pytest

import pandas as pd


def _df(linhas):
    import pandas as pd

    return pd.DataFrame(
        linhas,
        columns=[
            "data",
            "disciplina_id",
            "nome",
            "bloco",
            "feitas",
            "acertos",
            "chutes",
            "chutes_certos",
        ],
    )


def test_kpis_basicos():
    from src import metrics

    df = _df(
        [
            ["2026-08-01", 1, "A", "basico", 10, 8, 2, 1],
            ["2026-08-02", 2, "B", "especifico", 5, 2, 1, 0],
        ]
    )
    k = metrics.compute_kpis(df)
    assert k["feitas"] == 15
    assert k["acertos"] == 10
    assert k["erros"] == 5
    assert k["chutes"] == 3
    assert k["chutes_certos"] == 1
    assert k["acertos_sem_chute"] == 9
    assert k["taxa_acerto"] == pytest.approx(10 / 15)
    assert k["taxa_acerto_nao_chutadas"] == pytest.approx((10 - 1) / (15 - 3))
    assert k["nota_cebraspe"] == pytest.approx(7.5)


def test_kpis_vazio():
    from src import metrics

    k = metrics.compute_kpis(_df([]))
    assert k["feitas"] == 0
    assert k["acertos"] == 0
    assert k["taxa_acerto"] is None
    assert k["nota_cebraspe"] == 0


def test_divisao_por_zero():
    from src import metrics

    df = _df([["2026-08-01", 1, "A", "basico", 10, 5, 10, 5]])
    k = metrics.compute_kpis(df)
    assert k["taxa_acerto_seguro"] == 0.0
    assert k["taxa_acerto_nao_chutadas"] is None


def test_nota_cebraspe():
    from src import metrics

    df = _df([["2026-08-01", 1, "A", "basico", 100, 60, 0, 0]])
    k = metrics.compute_kpis(df)
    assert k["nota_cebraspe"] == 40


def test_serie_diaria():
    from src import metrics

    df = _df(
        [
            ["2026-08-01", 1, "A", "basico", 10, 8, 2, 1],
            ["2026-08-03", 1, "A", "basico", 5, 2, 1, 0],
        ]
    )
    s = metrics.serie_diaria(df)
    assert list(s["data"]) == ["2026-08-01", "2026-08-03"]
    assert s["feitas_acum"].iloc[-1] == 15
    assert s["acertos_acum"].iloc[-1] == 10
    assert s["taxa_acum"].iloc[-1] == pytest.approx(10 / 15)
    assert (s["feitas_acum"].diff().fillna(s["feitas_acum"].iloc[0]) >= 0).all()


def test_ranking_min_feitas():
    from src import metrics

    df = _df(
        [
            ["2026-08-01", 1, "A", "basico", 1, 1, 0, 0],
            ["2026-08-02", 2, "B", "especifico", 50, 40, 5, 2],
        ]
    )
    r = metrics.ranking(df, min_feitas=20)
    assert len(r) == 1
    assert r.iloc[0]["nome"] == "B"


def test_ranking_desempate():
    from src import metrics

    df = _df(
        [
            ["2026-08-01", 1, "A", "basico", 20, 16, 0, 0],
            ["2026-08-02", 2, "B", "especifico", 40, 32, 0, 0],
        ]
    )
    r = metrics.ranking(df, min_feitas=0)
    assert r.iloc[0]["nome"] == "B"


def test_ranking_taxa_sem_chute():
    from src import metrics

    df = _df(
        [
            ["2026-08-01", 1, "A", "basico", 20, 16, 4, 2],
            ["2026-08-02", 2, "B", "especifico", 20, 20, 20, 20],
        ]
    )
    r = metrics.ranking(df, min_feitas=0)
    linha_a = r[r["nome"] == "A"].iloc[0]
    linha_b = r[r["nome"] == "B"].iloc[0]
    assert linha_a["taxa_acerto_seguro"] == pytest.approx(14 / 20)
    assert linha_b["taxa_acerto_seguro"] == 0.0


def test_taxa_sem_chute_divide_pelo_total():
    from src import metrics

    df = _df(
        [
            ["2026-08-01", 1, "Língua Portuguesa", "basico", 25, 16, 1, 1],
        ]
    )
    k = metrics.compute_kpis(df)
    assert k["taxa_acerto_seguro"] == pytest.approx(15 / 25)


def test_ranking_metrica_segura():
    from src import metrics

    df = _df(
        [
            ["2026-08-01", 1, "A", "basico", 20, 16, 0, 0],
            ["2026-08-02", 2, "B", "especifico", 20, 15, 5, 5],
            ["2026-08-03", 3, "C", "basico", 20, 14, 0, 0],
        ]
    )
    r_taxa = metrics.ranking(df, min_feitas=0, metrica="taxa")
    assert list(r_taxa["nome"]) == ["A", "B", "C"]
    r_seg = metrics.ranking(df, min_feitas=0, metrica="taxa_segura")
    assert list(r_seg["nome"]) == ["A", "C", "B"]


def test_serie_horas_diaria():
    from src import metrics

    df = pd.DataFrame(
        {
            "data": ["2026-08-01", "2026-08-01", "2026-08-02"],
            "horas": [2.0, 1.5, 3.0],
        }
    )
    s = metrics.serie_horas_diaria(df)
    assert s["data"].tolist() == ["2026-08-01", "2026-08-02"]
    assert s["horas"].tolist() == [3.5, 3.0]
    assert s["horas_acum"].tolist() == [3.5, 6.5]
    assert metrics.serie_horas_diaria(pd.DataFrame(columns=["data", "horas"])).empty


def test_semanas_de():
    from src import metrics

    sem = metrics.semanas_de(["2026-08-03", "2026-08-10", "2026-08-13", "2026-08-03"])
    assert sem == [("2026-08-10", "2026-08-16"), ("2026-08-03", "2026-08-09")]


def test_horas_por_semana():
    import pandas as pd

    from src import metrics

    df = pd.DataFrame(
        {
            "data": ["2026-08-03", "2026-08-05", "2026-08-10", "2026-08-10"],
            "horas": [2.0, 1.5, 3.0, 1.0],
        }
    )
    sem = metrics.horas_por_semana(df)
    assert sem["semana_inicio"].tolist() == ["2026-08-10", "2026-08-03"]
    s1 = sem[sem["semana_inicio"] == "2026-08-03"].iloc[0]
    assert s1["data_fim"] == "2026-08-09"
    assert s1["horas"] == pytest.approx(3.5)
    assert s1["dias"] == 2
    assert s1["media_dia"] == pytest.approx(1.75)
    s2 = sem[sem["semana_inicio"] == "2026-08-10"].iloc[0]
    assert s2["horas"] == pytest.approx(4.0)
    assert s2["dias"] == 1


def test_comparar():
    from datetime import date

    from src import metrics

    df = _df(
        [
            ["2026-08-01", 1, "A", "basico", 10, 5, 2, 1],
            ["2026-09-01", 1, "A", "basico", 10, 8, 2, 1],
            ["2026-09-15", 2, "B", "especifico", 10, 9, 1, 0],
        ]
    )
    res = metrics.comparar(df, date(2026, 8, 15), date(2026, 9, 10))
    assert res["kpis_a"]["feitas"] == 10
    assert res["kpis_b"]["feitas"] == 20
    assert res["kpis_b"]["acertos"] == 13
    pd_comp = res["por_disciplina"]
    assert list(pd_comp["nome"]) == ["A"]
    linha = pd_comp.iloc[0]
    assert linha["feitas_periodo"] == 10
    assert linha["taxa_a"] == pytest.approx(0.5)
    assert linha["taxa_b"] == pytest.approx(13 / 20)
    assert linha["delta_pp"] == pytest.approx((0.65 - 0.5) * 100)