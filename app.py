import pandas as pd
import streamlit as st
from datetime import date, timedelta

from src import cache, charts, metrics
from src.auth import verificar_acesso
from src.db import init_db
from src.filters import (
    descrever_periodo,
    filtro_disciplinas,
    filtro_periodo,
    fmt_data_iso,
    fmt_nota,
    fmt_pct,
    render_kpis,
)

def _delta_nota(a, b):
    if a is None or b is None:
        return "—"
    return f"{b - a:+.1f}".replace(".", ",")


def _tabela_kpis_comparacao(res):
    ka, kb = res["kpis_a"], res["kpis_b"]

    def pct(v):
        return "—" if v is None else f"{v * 100:.1f}%".replace(".", ",")

    def nota(v):
        return "—" if v is None else f"{v:.1f}".replace(".", ",")

    def pp(a, b):
        if a is None or b is None:
            return "—"
        return f"{(b - a) * 100:+.1f} p.p.".replace(".", ",")

    def un(a, b):
        if a is None or b is None:
            return "—"
        return f"{b - a:+d}"

    linhas = [
        {"Métrica": "Questões tentadas", "Até A": str(ka["feitas"]), "Até B": str(kb["feitas"]), "Δ (B−A)": un(ka["feitas"], kb["feitas"])},
        {"Métrica": "Acertos", "Até A": str(ka["acertos"]), "Até B": str(kb["acertos"]), "Δ (B−A)": un(ka["acertos"], kb["acertos"])},
        {"Métrica": "Acertos sem chute", "Até A": str(ka["acertos_sem_chute"]), "Até B": str(kb["acertos_sem_chute"]), "Δ (B−A)": un(ka["acertos_sem_chute"], kb["acertos_sem_chute"])},
        {"Métrica": "Chutes", "Até A": str(ka["chutes"]), "Até B": str(kb["chutes"]), "Δ (B−A)": un(ka["chutes"], kb["chutes"])},
        {"Métrica": "Taxa de acerto", "Até A": pct(ka["taxa_acerto"]), "Até B": pct(kb["taxa_acerto"]), "Δ (B−A)": pp(ka["taxa_acerto"], kb["taxa_acerto"])},
        {"Métrica": "Nota Cebraspe", "Até A": nota(ka["nota_cebraspe"]), "Até B": nota(kb["nota_cebraspe"]), "Δ (B−A)": _delta_nota(ka["nota_cebraspe"], kb["nota_cebraspe"])},
    ]
    return pd.DataFrame(linhas)


st.set_page_config(page_title="Concursos · BCB TI", page_icon=":material/menu_book:", layout="wide")
verificar_acesso()
init_db()

st.title(":material/menu_book: Visão Global")

with st.sidebar:
    st.markdown("### Filtros")
    inicio, fim = filtro_periodo("vg")
    disc_ids = filtro_disciplinas("vg")

partes = [descrever_periodo(inicio, fim)]
partes.append(f"{len(disc_ids)} disciplina(s) selecionada(s)" if disc_ids else "todas as disciplinas")
st.caption(" · ".join(partes))

st.page_link(
    "pages/2_Registrar.py",
    label=":material/add: Registrar questões",
    width="stretch",
)

disc_tuple = tuple(disc_ids) if disc_ids else None

df = cache.list_registros(inicio, fim, disc_tuple)
if df.empty:
    st.info("Nenhum registro ainda. Comece pelo botão acima para registrar questões.")
    st.stop()

render_kpis(metrics.compute_kpis(df))

st.subheader(":material/show_chart: Evolução no tempo")
st.plotly_chart(charts.fig_evolucao(metrics.serie_diaria(df)), width="stretch")

st.subheader(":material/leaderboard: Desempenho por disciplina")
st.plotly_chart(
    charts.fig_por_disciplina(cache.agg_por_disciplina(inicio, fim, disc_tuple)),
    width="stretch",
)

st.subheader(":material/emoji_events: Ranking de disciplinas")
min_feitas = st.slider("Volume mínimo de questões por disciplina", 0, 100, 20, key="vg_min")
rank = metrics.ranking(df, min_feitas)
if rank.empty:
    st.info("Nenhuma disciplina atingiu o volume mínimo no recorte. Reduza o mínimo no controle acima.")
else:
    visao = rank.copy()
    visao["#"] = range(1, len(visao) + 1)
    visao["bloco_label"] = visao["bloco"].map({"basico": "Básicos", "especifico": "Específicos"})
    visao["taxa_pct"] = visao["taxa_acerto"] * 100
    visao["nota_fmt"] = visao["nota_cebraspe"].map(fmt_nota)
    st.dataframe(
        visao[["#", "nome", "bloco_label", "feitas", "acertos", "taxa_pct", "nota_fmt"]],
        width="stretch",
        hide_index=True,
        column_config={
            "#": "#",
            "nome": "Disciplina",
            "bloco_label": "Bloco",
            "feitas": "Feitas",
            "acertos": "Acertos",
            "taxa_pct": st.column_config.ProgressColumn(
                "Taxa de acerto", min_value=0, max_value=100, format="%.1f%%"
            ),
            "nota_fmt": "Nota Cebraspe",
        },
    )
    ocultas = df["disciplina_id"].nunique() - len(rank)
    st.caption(
        f"Ranking com volume mínimo de {min_feitas} questões por disciplina. "
        f"{ocultas} disciplina(s) ocultada(s) abaixo do mínimo."
    )

with st.expander(":material/compare_arrows: Comparar dois momentos", expanded=False):
    st.caption(
        "Compara o desempenho **acumulado** até cada data de corte. "
        "Respeita o filtro de disciplinas; o filtro de período não se aplica."
    )
    col_a, col_b = st.columns(2)
    hoje = date.today()
    corte_a = col_a.date_input(
        "Data A (referência)", value=hoje - timedelta(days=30), max_value=hoje, key="cmp_a",
        format="DD/MM/YYYY",
    )
    corte_b = col_b.date_input(
        "Data B (comparação)", value=hoje, max_value=hoje, key="cmp_b", format="DD/MM/YYYY"
    )
    if corte_a >= corte_b:
        st.warning("A data A deve ser anterior à data B.")
    else:
        df_comp = cache.list_registros(None, None, disc_tuple)
        res = metrics.comparar(df_comp, corte_a, corte_b)

        st.markdown("**KPIs acumulados**")
        st.dataframe(_tabela_kpis_comparacao(res), width="stretch", hide_index=True)

        por_disc = res["por_disciplina"]
        if por_disc.empty:
            st.info("Nenhuma disciplina com questões feitas no período A→B.")
        else:
            st.markdown("**Por disciplina (feitas no período A→B)**")
            visao_comp = por_disc.copy()
            visao_comp["taxa_a_fmt"] = visao_comp["taxa_a"].map(fmt_pct)
            visao_comp["taxa_b_fmt"] = visao_comp["taxa_b"].map(fmt_pct)
            visao_comp["delta_fmt"] = visao_comp["delta_pp"].map(
                lambda v: "—" if v is None else f"{v:+.1f} p.p.".replace(".", ",")
            )
            st.dataframe(
                visao_comp[
                    ["nome", "feitas_periodo", "taxa_a_fmt", "taxa_b_fmt", "delta_fmt"]
                ],
                width="stretch",
                hide_index=True,
                column_config={
                    "nome": "Disciplina",
                    "feitas_periodo": "Feitas no período A→B",
                    "taxa_a_fmt": "Taxa até A",
                    "taxa_b_fmt": "Taxa até B",
                    "delta_fmt": "Δ taxa (p.p.)",
                },
            )
            st.plotly_chart(charts.fig_comparacao(por_disc), width="stretch")