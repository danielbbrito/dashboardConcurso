import streamlit as st
from datetime import date

from src import cache, repository
from src.auth import verificar_acesso
from src.db import init_db
from src.filters import (
    fmt_data_iso,
    fmt_nota,
    fmt_pct,
    label_com_bloco,
    render_tabela_registros_com_exclusao,
)

st.set_page_config(page_title="Registrar · Concursos BCB TI", page_icon=":material/edit:", layout="wide")
verificar_acesso()
init_db()

st.title(":material/edit: Registrar questões")

disciplinas = cache.list_disciplinas()

with st.form("form_registro", clear_on_submit=False):
    col1, col2 = st.columns(2)
    data = col1.date_input("Data", value=date.today(), max_value=date.today(), format="DD/MM/YYYY")
    disc = col2.selectbox("Disciplina", disciplinas, format_func=label_com_bloco)
    col3, col4 = st.columns(2)
    feitas = col3.number_input("Questões feitas", min_value=1, step=1, format="%d")
    acertos = col4.number_input("Acertos", min_value=0, step=1, format="%d")
    col5, col6 = st.columns(2)
    chutes = col5.number_input(
        "Chutes",
        min_value=0,
        step=1,
        value=0,
        format="%d",
        help="Questões que você respondeu sem segurança (no Cebraspe, as que você marcou na dúvida em vez de deixar em branco).",
    )
    chutes_certos = col6.number_input(
        "Chutes certos",
        min_value=0,
        step=1,
        value=0,
        format="%d",
        help="Desses chutes, quantos você acertou. É o que separa acerto de sorte: Acertos sem chute = Acertos − Chutes certos.",
    )
    submitted = st.form_submit_button(":material/save: Salvar registro", type="primary")

if submitted:
    erros = repository.validar_registro(data, feitas, acertos, chutes, chutes_certos)
    if erros:
        st.error("\n".join(f"- {e}" for e in erros))
    else:
        repository.insert_registro(
            str(data), disc["id"], int(feitas), int(acertos), int(chutes), int(chutes_certos)
        )
        st.cache_data.clear()
        n = repository.count_registros(str(data), disc["id"])
        if n > 1:
            st.caption(
                f"Já existem {n} registros nesta data para esta disciplina; "
                "os valores serão somados nos relatórios."
            )
        taxa = acertos / feitas
        nota = acertos - 0.5 * (feitas - acertos)
        st.success(
            f":material/check_circle: **Registrado:** **{disc['nome']}** · {fmt_data_iso(str(data))} · "
            f"{int(feitas)} feitas · {int(acertos)} acertos (taxa {fmt_pct(taxa)}) · "
            f"{int(chutes)} chutes ({int(chutes_certos)} certo(s)) · nota Cebraspe {fmt_nota(nota)}"
        )

st.subheader("Últimos registros")
recentes = cache.list_registros(limit=15)
render_tabela_registros_com_exclusao(recentes, "rec")