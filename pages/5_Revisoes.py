import calendar as cal
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

COR_MARCA = {
    "24h": "#f59e0b",
    "7 dias": "#3b82f6",
    "30 dias": "#10b981",
}

st.set_page_config(
    page_title="Revisões · Concursos BCB TI",
    page_icon=":material/event_repeat:",
    layout="wide",
)
verificar_acesso()
init_db()

st.title(":material/event_repeat: Revisões")
st.caption(
    "Registre a matéria estudada no dia e ela entra automaticamente no calendário para "
    "revisão em **24 horas**, **7 dias** e **30 dias** (repetição espaçada)."
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
        resumo = " · ".join(
            f"**{tipo}** em {fmt_data_iso(d.isoformat())}" for tipo, d in revisoes.revisoes_de(data)
        )
        st.success(
            f":material/check_circle: **Registrado:** **{materia.strip()}** · {disc['nome']} · "
            f"{fmt_data_iso(str(data))} — revisões: {resumo}"
        )

df = cache.list_materias()
rev_por_dia = revisoes.mapa_revisoes(df)
estudos_por_dia = revisoes.mapa_estudos(df)

hoje = date.today()
hoje_iso = hoje.isoformat()
n_hoje = len(rev_por_dia.get(hoje_iso, []))
n_atrasadas = sum(len(v) for k, v in rev_por_dia.items() if k < hoje_iso)
fim_7 = (hoje + timedelta(days=7)).isoformat()
n_proximas_7 = sum(len(v) for k, v in rev_por_dia.items() if hoje_iso <= k <= fim_7)

k1, k2, k3, k4 = st.columns(4)
k1.metric("Revisões hoje", n_hoje, help="Matérias programadas para revisão hoje (24h, 7 dias ou 30 dias).")
k2.metric("Revisões atrasadas", n_atrasadas, help="Revisões cuja data já passou e não foram feitas.")
k3.metric("Revisões nos próximos 7 dias", n_proximas_7, help="Revisões de hoje até daqui a 7 dias.")
k4.metric("Matérias registradas", len(df), help="Total de matérias cadastradas.")

st.subheader(":material/calendar_month: Calendário de revisões")

if "rev_ano_mes" not in st.session_state:
    st.session_state["rev_ano_mes"] = date(hoje.year, hoje.month, 1)
mes = st.session_state["rev_ano_mes"]

col_prev, col_titulo, col_prox = st.columns([1, 3, 1])
with col_prev:
    if st.button(":material/chevron_left:", key="rev_mes_ant", width="stretch", help="Mês anterior"):
        total = mes.month - 2
        ano = mes.year + total // 12
        st.session_state["rev_ano_mes"] = date(ano, total % 12 + 1, 1)
        st.rerun()
col_titulo.markdown(f"### {mes.strftime('%B de %Y')}")
with col_prox:
    if st.button(":material/chevron_right:", key="rev_mes_prox", width="stretch", help="Próximo mês"):
        total = mes.month
        ano = mes.year + total // 12
        st.session_state["rev_ano_mes"] = date(ano, total % 12 + 1, 1)
        st.rerun()

nomes_dias = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]
cols = st.columns(7)
for col, nome in zip(cols, nomes_dias):
    col.markdown(f"**{nome}**")

dia_sel_iso = st.session_state.get("rev_dia_selecionado", hoje_iso)

for semana in cal.Calendar(firstweekday=0).monthdatescalendar(mes.year, mes.month):
    cols = st.columns(7)
    for col, dia in zip(cols, semana):
        if dia.month != mes.month:
            continue
        dia_iso = dia.isoformat()
        marcadores = []
        if dia_iso in estudos_por_dia:
            marcadores.append("•")
        for tipo, _, _ in revisoes.INTERVALOS:
            n_tipo = sum(1 for r in rev_por_dia.get(dia_iso, []) if r["tipo"] == tipo)
            if n_tipo:
                marca = revisoes.MARCAS[tipo]
                marcadores.append(marca if n_tipo == 1 else f"{marca}×{n_tipo}")
        rotulo = str(dia.day)
        if marcadores:
            rotulo += "\n" + " ".join(marcadores)
        if col.button(
            rotulo,
            key=f"rev_dia_{dia_iso}",
            type="primary" if dia_iso == dia_sel_iso else "secondary",
            width="stretch",
        ):
            st.session_state["rev_dia_selecionado"] = dia_iso
            st.rerun()

legenda = ' · '.join(
    f'<span style="display:inline-block;width:.7rem;height:.7rem;border-radius:50%;'
    f'background:{cor};margin-right:.3rem"></span>{tipo}'
    for tipo, cor in COR_MARCA.items()
)
st.markdown(
    f'<div style="display:flex;gap:1.5rem;flex-wrap:wrap;align-items:center;padding:.3rem 0">'
    f'<span><span style="display:inline-block;width:.7rem;height:.7rem;border-radius:50%;'
    f'background:#94a3b8;margin-right:.3rem"></span>dia de estudo</span>{legenda}</div>',
    unsafe_allow_html=True,
)

dia_sel = date.fromisoformat(dia_sel_iso)
st.subheader(f":material/today: Dia {fmt_data_iso(dia_sel_iso)}")
if dia_sel < hoje:
    st.caption("Dia no passado — revisões abaixo estão atrasadas.")
estudos = estudos_por_dia.get(dia_sel_iso, [])
itens = rev_por_dia.get(dia_sel_iso, [])
if not estudos and not itens:
    st.info(f"Nenhuma matéria estudada nem revisão em {fmt_data_iso(dia_sel_iso)}.")
else:
    if estudos:
        st.markdown("**Matérias estudadas neste dia**")
        for r in estudos:
            sub = f" · {r['submateria']}" if r["submateria"] else ""
            st.markdown(f"- {r['nome']} — **{r['materia']}**{sub}")
    for tipo, _, _ in revisoes.INTERVALOS:
        grupo = [r for r in itens if r["tipo"] == tipo]
        if not grupo:
            continue
        st.markdown(f"**Revisão de {tipo}**")
        for r in grupo:
            sub = f" · {r['submateria']}" if r["submateria"] else ""
            st.markdown(f"- {r['disciplina']} — **{r['materia']}**{sub} _(estudada em {fmt_data_iso(r['data_estudo'])})_")

st.subheader(":material/upcoming: Próximas revisões")
futuras = revisoes.expandir(df)
futuras = futuras[futuras["data_revisao"] >= hoje_iso].sort_values("data_revisao")
if futuras.empty:
    st.info("Nenhuma revisão programada a partir de hoje.")
else:
    visao = futuras.head(15).copy()
    visao["data_fmt"] = visao["data_revisao"].map(fmt_data_iso)
    visao["sub"] = visao["submateria"].fillna("")
    st.dataframe(
        visao[["data_fmt", "tipo", "disciplina", "materia", "sub"]],
        width="stretch",
        hide_index=True,
        column_config={
            "data_fmt": "Data",
            "tipo": "Intervalo",
            "disciplina": "Disciplina",
            "materia": "Matéria",
            "sub": "Submatéria",
        },
    )
    st.caption("15 próximas revisões; no calendário acima cada dia mostra a quantidade por intervalo.")

st.subheader(":material/history: Matérias registradas")
recentes = cache.list_materias(limit=15)
render_tabela_materias_com_exclusao(recentes, "rev_hist")
