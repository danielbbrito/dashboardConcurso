import streamlit as st

from src import cache, charts
from src.auth import verificar_acesso
from src.db import init_db
from src.filters import (
    filtro_disciplinas,
    filtro_periodo,
    preparar_tabela_materias,
)

st.set_page_config(
    page_title="Matérias · Concursos BCB TI",
    page_icon=":material/topic:",
    layout="wide",
)
verificar_acesso()
init_db()

st.title(":material/topic: Matérias × dificuldade × acertos")
st.caption(
    "Relaciona as sessões de questões com matéria registrada (item 18 do edital ou 'Simulado'), "
    "a dificuldade percebida e a taxa de acertos."
)

with st.sidebar:
    st.markdown("### Filtros")
    inicio, fim = filtro_periodo("ma")
    disc_ids = filtro_disciplinas("ma")
    por_sub = st.checkbox("Detalhar por submatéria", key="ma_por_sub")

disc_tuple = tuple(disc_ids) if disc_ids else None

df = cache.list_registros(inicio, fim, disc_tuple)
if df.empty:
    st.info("Nenhum registro de questões no período.")
    st.stop()

df_com_materia = df[df["materia"].notna() & (df["materia"] != "")]
df_com_dificuldade = df[df["dificuldade"].notna() & (df["dificuldade"] != "")]

k1, k2, k3, k4 = st.columns(4)
k1.metric(
    "Sessões com matéria",
    len(df_com_materia),
    help="Registros de questões em que a matéria foi informada.",
)
k2.metric(
    "Questões com matéria",
    int(df_com_materia["feitas"].sum()),
    help="Total de questões feitas em sessões com matéria registrada.",
)
k3.metric(
    "Matérias distintas",
    df_com_materia["materia"].nunique(),
    help="Matérias diferentes registradas (sem submatéria).",
)
k4.metric(
    "Taxa geral com matéria",
    fmt_pct(df_com_materia["acertos"].sum() / df_com_materia["feitas"].sum()),
    help="Taxa de acerto das sessões em que a matéria foi informada.",
)

st.subheader(":material/scatter_plot: Dificuldade percebida × taxa de acerto")
agg = cache.agg_por_materia(inicio, fim, disc_tuple, por_submateria=por_sub)
st.plotly_chart(charts.fig_materias(agg), width="stretch")
if por_sub:
    st.caption("Detalhado por submatéria; pontos com mesma submatéria compartilham a dificuldade da sessão.")
else:
    st.caption(
        "Cada ponto é uma matéria (tamanho = questões feitas). Sessões registradas como "
        "'Simulado' aparecem como uma matéria própria."
    )

st.subheader(":material/bar_chart: Taxa de acerto por dificuldade percebida")
agg_d = cache.agg_por_dificuldade(inicio, fim, disc_tuple)
if agg_d.empty:
    st.info("Nenhuma sessão com dificuldade registrada no recorte.")
else:
    st.plotly_chart(charts.fig_por_dificuldade(agg_d), width="stretch")
    visao_d = agg_d.copy()
    visao_d["taxa"] = (visao_d["acertos"] / visao_d["feitas"]).map(fmt_pct)
    st.dataframe(
        visao_d[
            ["dificuldade", "n_sessoes", "feitas", "acertos", "taxa"]
        ],
        width="stretch",
        hide_index=True,
        column_config={
            "dificuldade": "Dificuldade percebida",
            "n_sessoes": "Sessões",
            "feitas": "Feitas",
            "acertos": "Acertos",
            "taxa": "Taxa de acerto",
        },
    )

st.subheader(":material/table: Desempenho por matéria")
if agg.empty:
    st.info("Nenhuma sessão com matéria registrada no recorte.")
else:
    min_feitas = st.slider("Volume mínimo de questões por matéria", 0, 100, 10, key="ma_min")
    visao, colunas, config = preparar_tabela_materias(agg, por_sub, min_feitas)
    if visao.empty:
        st.info("Nenhuma matéria atingiu o volume mínimo. Reduza o mínimo acima.")
    else:
        st.dataframe(
            visao[colunas],
            width="stretch",
            hide_index=True,
            column_config=config,
        )
        st.caption(
            "Dificuldade média: 1 = muito fácil · 2 = fácil · 3 = médio · 4 = difícil. "
            "Sessões registradas sem matéria ficam de fora desta tabela."
        )

with st.expander(":material/info: Sobre a origem das matérias", expanded=False):
    st.markdown(
        "As opções de matéria e submatéria vêm do **item 18.2 (Conhecimentos)** do Edital nº 1/2024 "
        "do concurso BCB — cargo Analista, área Tecnologia da Informação (págs. 33–35). "
        "A opção **'Simulado'** cobre provas completas ou blocos avulsos, fora de uma matéria específica."
    )