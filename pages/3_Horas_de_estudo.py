import streamlit as st
from datetime import date

from src import cache, charts, metrics, repository
from src.auth import verificar_acesso
from src.db import init_db
from src.filters import (
    descrever_periodo,
    filtro_periodo,
    fmt_data_iso,
    fmt_horas,
    render_tabela_horas_com_exclusao,
)

st.set_page_config(
    page_title="Horas de estudo · Concursos BCB TI",
    page_icon=":material/schedule:",
    layout="wide",
)
verificar_acesso()
init_db()

st.title(":material/schedule: Horas de estudo")

with st.form("form_horas", clear_on_submit=False):
    col1, col2 = st.columns(2)
    data = col1.date_input("Data", value=date.today(), max_value=date.today(), format="DD/MM/YYYY")
    horas = col2.number_input(
        "Horas estudadas",
        min_value=0.0,
        step=0.5,
        value=1.0,
        format="%.1f",
        help="Tempo de estudo no dia (por exemplo, 1,5 para uma hora e meia).",
    )
    submitted = st.form_submit_button(":material/save: Salvar horas", type="primary")

if submitted:
    erros = repository.validar_horas(data, horas)
    if erros:
        st.error("\n".join(f"- {e}" for e in erros))
    else:
        repository.insert_horas(str(data), float(horas))
        st.cache_data.clear()
        st.success(
            f":material/check_circle: **Registrado:** {fmt_data_iso(str(data))} · "
            f"{fmt_horas(float(horas))}"
        )

with st.sidebar:
    st.markdown("### Filtros")
    inicio, fim = filtro_periodo("he")
    dias_do_periodo = cache.agg_horas_por_dia(inicio, fim)

    semana_selecionada = None
    dia_selecionado = None
    dias_filtrados = dias_do_periodo
    if not dias_do_periodo.empty:
        semanas = metrics.semanas_de(dias_do_periodo["data"])
        rotulos_semana = ["Todas as semanas"] + [
            f"{fmt_data_iso(a)} → {fmt_data_iso(b)}" for a, b in semanas
        ]
        idx_semana = st.selectbox(
            "Semana",
            range(len(rotulos_semana)),
            format_func=lambda i: rotulos_semana[i],
            key="he_semana",
        )
        if idx_semana > 0:
            semana_selecionada = semanas[idx_semana - 1]
            a, b = semana_selecionada
            dias_filtrados = dias_do_periodo[
                (dias_do_periodo["data"] >= a) & (dias_do_periodo["data"] <= b)
            ]

        if not dias_filtrados.empty:
            rotulos_dia = ["Todos os dias"] + [
                fmt_data_iso(d) for d in dias_filtrados["data"]
            ]
            idx_dia = st.selectbox(
                "Dia",
                range(len(rotulos_dia)),
                format_func=lambda i: rotulos_dia[i],
                key="he_dia",
            )
            if idx_dia > 0:
                dia_selecionado = dias_filtrados.iloc[idx_dia - 1]["data"]
                dias_filtrados = dias_filtrados[
                    dias_filtrados["data"] == dia_selecionado
                ]

partes = [descrever_periodo(inicio, fim)]
if semana_selecionada:
    a, b = semana_selecionada
    partes.append(f"semana {fmt_data_iso(a)} → {fmt_data_iso(b)}")
if dia_selecionado:
    partes.append(f"dia {fmt_data_iso(dia_selecionado)}")
st.caption(" · ".join(partes))

if dias_filtrados.empty:
    st.info("Nenhuma hora registrada no recorte. Use o formulário acima para registrar o estudo do dia.")
else:
    total_horas = float(dias_filtrados["horas"].sum())
    n_dias = len(dias_filtrados)
    n_semanas = len(metrics.semanas_de(dias_filtrados["data"]))

    k1, k2, k3, k4 = st.columns(4)
    k1.metric("Total de horas", fmt_horas(total_horas), help="Soma das horas no recorte")
    k2.metric("Dias com estudo", n_dias, help="Quantidade de dias com pelo menos um registro")
    k3.metric(
        "Média por dia de estudo",
        fmt_horas(total_horas / n_dias),
        help="Total de horas ÷ dias com estudo",
    )
    k4.metric(
        "Média por semana",
        fmt_horas(total_horas / n_semanas),
        help="Total de horas ÷ semanas ativas no recorte",
    )

    st.subheader(":material/show_chart: Progressão das horas")
    st.plotly_chart(
        charts.fig_evolucao_horas(metrics.serie_horas_diaria(dias_filtrados)),
        width="stretch",
    )
    st.caption("Barras = horas por dia · Linha = acumulado de horas no recorte")

    st.subheader(":material/calendar_month: Totais por semana")
    sem = metrics.horas_por_semana(dias_filtrados)
    visao_sem = sem.copy()
    visao_sem["semana_fmt"] = [
        f"{fmt_data_iso(a)} → {fmt_data_iso(b)}" for a, b in zip(sem["semana_inicio"], sem["data_fim"])
    ]
    visao_sem["horas_fmt"] = visao_sem["horas"].map(fmt_horas)
    visao_sem["media_fmt"] = visao_sem["media_dia"].map(fmt_horas)
    st.dataframe(
        visao_sem[["semana_fmt", "horas_fmt", "dias", "media_fmt"]],
        width="stretch",
        hide_index=True,
        column_config={
            "semana_fmt": "Semana",
            "horas_fmt": "Total de horas",
            "dias": "Dias com estudo",
            "media_fmt": "Média/dia",
        },
    )

    st.subheader(":material/calendar_today: Totais por dia")
    visao_dias = dias_filtrados.copy()
    visao_dias["data_fmt"] = visao_dias["data"].map(fmt_data_iso)
    visao_dias["horas_fmt"] = visao_dias["horas"].map(fmt_horas)
    st.dataframe(
        visao_dias[["data_fmt", "horas_fmt"]],
        width="stretch",
        hide_index=True,
        column_config={"data_fmt": "Dia", "horas_fmt": "Horas"},
    )

st.subheader(":material/history: Registros de horas")
recentes = cache.list_horas(inicio, fim, limit=15)
render_tabela_horas_com_exclusao(recentes, "he_hist")
