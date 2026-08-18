from datetime import date, timedelta

import streamlit as st

from . import cache, repository

PRESETS = [
    "Hoje",
    "Últimos 7 dias",
    "Últimos 30 dias",
    "Últimos 90 dias",
    "Este mês",
    "Tudo",
    "Personalizado",
]

BLOCO_LABEL = {"basico": "Básicos", "especifico": "Específicos"}
BLOCO_PROVA = {
    "basico": "Conhecimentos Básicos (P1)",
    "especifico": "Conhecimentos Específicos (P2)",
}


def label_com_bloco(disc):
    return f"{disc['nome']} — {BLOCO_LABEL[disc['bloco']]}"


def filtro_periodo(key_prefix, padrao="Últimos 30 dias"):
    index = PRESETS.index(padrao) if padrao in PRESETS else 2
    escolha = st.selectbox("Período", PRESETS, index=index, key=f"{key_prefix}_periodo")
    hoje = date.today()
    if escolha == "Hoje":
        return hoje, hoje
    if escolha == "Últimos 7 dias":
        return hoje - timedelta(days=6), hoje
    if escolha == "Últimos 30 dias":
        return hoje - timedelta(days=29), hoje
    if escolha == "Últimos 90 dias":
        return hoje - timedelta(days=89), hoje
    if escolha == "Este mês":
        return hoje.replace(day=1), hoje
    if escolha == "Tudo":
        return None, None
    intervalo = st.date_input(
        "Intervalo personalizado",
        value=(hoje - timedelta(days=29), hoje),
        key=f"{key_prefix}_custom",
        format="DD/MM/YYYY",
    )
    if isinstance(intervalo, (list, tuple)) and len(intervalo) == 2:
        a, b = intervalo
        if a > b:
            a, b = b, a
        return a, b
    return None, None


def filtro_disciplinas(key_prefix):
    disc = cache.list_disciplinas()
    opcoes = st.multiselect(
        "Disciplinas", disc, format_func=label_com_bloco, key=f"{key_prefix}_disc"
    )
    return [d["id"] for d in opcoes] or None


def descrever_periodo(inicio, fim):
    if inicio is None and fim is None:
        return "Todo o período"
    if inicio == fim:
        return f"Hoje · {fmt_data_iso(str(inicio))}"
    return f"{fmt_data_iso(str(inicio))} → {fmt_data_iso(str(fim))}"


def fmt_pct(v):
    return "—" if v is None else f"{v * 100:.1f}%".replace(".", ",")


def fmt_nota(v):
    return "—" if v is None else f"{v:.1f}".replace(".", ",")


def fmt_pp(v):
    return "—" if v is None else f"{v:+.1f} p.p.".replace(".", ",")


def fmt_data_iso(iso):
    try:
        return date.fromisoformat(iso).strftime("%d/%m/%Y")
    except (TypeError, ValueError):
        return str(iso or "—")


def render_kpis(k):
    c1, c2, c3, c4, c5, c6 = st.columns(6)
    chutes = str(k["chutes"])
    if k["pct_chutes"] is not None:
        chutes = f"{k['chutes']} ({fmt_pct(k['pct_chutes'])})"
    c1.metric("Questões tentadas", k["feitas"], help="Total de questões resolvidas no recorte")
    c2.metric("Acertos", k["acertos"], help="Questões respondidas corretamente")
    c3.metric(
        "Acertos sem chute",
        k["acertos_sem_chute"],
        help="Acertos que não vieram de chute (acertos − chutes certos)",
    )
    c4.metric("Chutes", chutes, help="Questões respondidas sem segurança")
    c5.metric("Taxa de acerto", fmt_pct(k["taxa_acerto"]), help="acertos / tentadas")
    c6.metric(
        "Nota líquida Cebraspe",
        fmt_nota(k["nota_cebraspe"]),
        help="acertos − 0,5 × erros (regra do edital)",
    )


def render_tabela_registros_com_exclusao(df, key):
    flash = st.session_state.pop(f"_flash_{key}", None)
    if flash:
        st.success(flash)
    if df is None or df.empty:
        st.info("Nenhum registro encontrado.")
        return
    visao = df.copy()
    visao["data_fmt"] = visao["data"].map(fmt_data_iso)
    visao["taxa"] = (visao["acertos"] / visao["feitas"]).map(fmt_pct)
    visao["criado_fmt"] = visao["criado_em"].str[:16]
    colunas = [
        "id",
        "data_fmt",
        "nome",
        "feitas",
        "acertos",
        "chutes",
        "chutes_certos",
        "taxa",
        "criado_fmt",
    ]
    st.dataframe(
        visao[colunas],
        width="stretch",
        hide_index=True,
        column_config={
            "id": "ID",
            "data_fmt": "Data",
            "nome": "Disciplina",
            "feitas": "Feitas",
            "acertos": "Acertos",
            "chutes": "Chutes",
            "chutes_certos": "Chutes certos",
            "taxa": "Taxa",
            "criado_fmt": "Registrado em",
        },
    )
    with st.expander(":material/delete: Excluir registro", expanded=False):
        ids = visao["id"].tolist()
        sel = st.selectbox("Registro (ID) a excluir", ids, key=f"{key}_del_sel")
        conf = st.checkbox("Confirmo a exclusão", key=f"{key}_del_conf")
        if st.button(
            ":material/delete: Excluir", key=f"{key}_del_btn", type="secondary", disabled=not conf
        ):
            repository.delete_registro(int(sel))
            st.cache_data.clear()
            st.session_state[f"_flash_{key}"] = f"Registro {sel} excluído."
            st.rerun()