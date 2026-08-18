import pytest


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
    assert k["taxa_acerto_seguro"] is None


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