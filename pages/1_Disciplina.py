import streamlit as st

from src import cache, charts, metrics, repository
from src.auth import verificar_acesso
from src.db import init_db
from src.filters import (
    BLOCO_PROVA,
    filtro_periodo,
    label_com_bloco,
    render_kpis,
    render_tabela_registros_com_exclusao,
)

st.set_page_config(page_title="Disciplina · Concursos BCB TI", page_icon=":material/menu_book:", layout="wide")
verificar_acesso()
init_db()

disciplinas = cache.list_disciplinas()

with st.sidebar:
    st.markdown("### Filtros")
    disc = st.selectbox("Disciplina", disciplinas, format_func=label_com_bloco, key="pd_disc")
    inicio, fim = filtro_periodo("pd", padrao="Tudo")

st.title(disc["nome"])
st.caption(f"{BLOCO_PROVA[disc['bloco']]} · {disc['itens_prova']} itens na prova")

st.page_link(
    "pages/2_Registrar.py",
    label=":material/add: Registrar questões",
    width="stretch",
)

df = cache.list_registros(inicio, fim, (disc["id"],))
if df.empty:
    st.info("Sem registros para esta disciplina no período.")
else:
    render_kpis(metrics.compute_kpis(df))

    st.subheader(":material/show_chart: Evolução no tempo")
    st.plotly_chart(
        charts.fig_evolucao(metrics.serie_diaria(df), mostrar_taxa_segura=True),
        width="stretch",
    )

    st.subheader("Histórico de registros")
    render_tabela_registros_com_exclusao(df, "pd_hist")

st.subheader(":material/edit_note: Anotações")
texto = st.text_area(
    "Anotações da disciplina (Markdown)",
    value=cache.get_anotacao(disc["id"]),
    height=220,
    placeholder="tópicos que mais erro · regras de exceção · links de material · erros recorrentes",
)
if st.button(":material/save: Salvar anotações", type="primary"):
    repository.save_anotacao(disc["id"], texto)
    st.cache_data.clear()
    ts = repository.get_anotacao_atualizado_em(disc["id"])
    st.success(f"Anotações salvas · atualizado em {ts}")

atualizado = cache.get_anotacao_atualizado_em(disc["id"])
if atualizado:
    st.caption(f"Última atualização: {atualizado}")

with st.expander(":material/visibility: Pré-visualizar (Markdown)", expanded=False):
    if texto.strip():
        st.markdown(texto)
    else:
        st.caption("Anotação vazia.")