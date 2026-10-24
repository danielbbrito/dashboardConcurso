import streamlit as st
from datetime import date, timedelta

from src import cache, repository, revisoes
from src.auth import verificar_acesso
from src.db import init_db
from src.filters import (
    fmt_data_iso,
    label_com_bloco,
    render_tabela_materias_com_exclusao,
)

st.set_page_config(
    page_title="Revisões · Concursos BCB TI",
    page_icon=":material/event_repeat:",
    layout="wide",
)
verificar_acesso()
init_db()

st.title(":material/event_repeat: Revisões semanais")
st.caption(
    "As matérias estudadas entre domingo e sábado são agrupadas para revisão "
    "no **sábado da semana seguinte**."
)

disciplinas = cache.list_disciplinas()

with st.form("form_materia", clear_on_submit=False):
    col1, col2 = st.columns(2)
    data = col1.date_input(
        "Data do estudo", value=date.today(), max_value=date.today(), format="DD/MM/YYYY"
    )
    disc = col2.selectbox("Disciplina", disciplinas, format_func=label_com_bloco)
    materia = st.text_input("Matéria", placeholder="ex.: Denotação e conotação")
    submateria = st.text_input("Submatéria (opcional)", placeholder="ex.: Funções da linguagem")
    submitted = st.form_submit_button(":material/save: Salvar matéria", type="primary")

if submitted:
    erros = repository.validar_materia(data, materia)
    if erros:
        st.error("\n".join(f"- {e}" for e in erros))
    else:
        repository.insert_materia(str(data), disc["id"], materia.strip(), submateria.strip() or None)
        st.cache_data.clear()
        data_revisao = revisoes.revisoes_de(data)[0][1]
        st.success(
            f":material/check_circle: **Registrado:** **{materia.strip()}** · {disc['nome']} · "
            f"{fmt_data_iso(str(data))} — marcada para revisão no sábado, "
            f"{fmt_data_iso(data_revisao.isoformat())}"
        )

df = cache.list_materias()
hoje = date.today()
if "rev_semana_inicio" not in st.session_state:
    st.session_state["rev_semana_inicio"] = revisoes.inicio_semana(hoje)
semana_inicio = revisoes.inicio_semana(st.session_state["rev_semana_inicio"])
st.session_state["rev_semana_inicio"] = semana_inicio
semana_fim = semana_inicio + timedelta(days=6)

col_prev, col_titulo, col_prox = st.columns([1, 4, 1])
with col_prev:
    if st.button(":material/chevron_left:", key="rev_semana_ant", width="stretch", help="Semana anterior"):
        st.session_state["rev_semana_inicio"] = semana_inicio - timedelta(days=7)
        st.rerun()
col_titulo.markdown(
    f"### Semana da revisão: {fmt_data_iso(semana_inicio.isoformat())} "
    f"a {fmt_data_iso(semana_fim.isoformat())}"
)
with col_prox:
    if st.button(":material/chevron_right:", key="rev_semana_prox", width="stretch", help="Próxima semana"):
        st.session_state["rev_semana_inicio"] = semana_inicio + timedelta(days=7)
        st.rerun()

semana_estudo_inicio = semana_inicio - timedelta(days=7)
semana_estudo_fim = semana_estudo_inicio + timedelta(days=6)
itens_semana = revisoes.revisoes_na_semana(df, semana_estudo_inicio)
st.subheader(f":material/event_repeat: Revisão de sábado — {fmt_data_iso(semana_fim.isoformat())}")
st.caption(
    f"Matérias estudadas de {fmt_data_iso(semana_estudo_inicio.isoformat())} "
    f"a {fmt_data_iso(semana_estudo_fim.isoformat())}"
)
st.metric("Matérias para revisar no sábado", len(itens_semana))

if itens_semana.empty:
    st.info("Nenhuma matéria estudada na semana anterior para revisar neste sábado.")
else:
    visao = itens_semana.copy()
    visao["data_fmt"] = visao["data_revisao"].map(fmt_data_iso)
    visao["estudo_fmt"] = visao["data_estudo"].map(fmt_data_iso)
    visao["sub"] = visao["submateria"].fillna("")
    st.dataframe(
        visao[["data_fmt", "disciplina", "materia", "sub", "estudo_fmt"]],
        width="stretch",
        hide_index=True,
        column_config={
            "data_fmt": "Revisar em",
            "disciplina": "Disciplina",
            "materia": "Matéria",
            "sub": "Submatéria",
            "estudo_fmt": "Estudada em",
        },
    )

st.subheader(":material/history: Matérias registradas")
recentes = cache.list_materias(limit=15)
render_tabela_materias_com_exclusao(recentes, "rev_hist")
