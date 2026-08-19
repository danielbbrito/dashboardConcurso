import pandas as pd
import streamlit as st

from src import cache, charts, repository
from src.auth import verificar_acesso
from src.ciclo import montar_ciclo, resolver_permutacao
from src.db import init_db
from src.filters import fmt_horas

st.set_page_config(
    page_title="Ciclo de estudos · Concursos BCB TI",
    page_icon=":material/cycle:",
    layout="wide",
)
verificar_acesso()
init_db()

st.title(":material/cycle: Ciclo de estudos")
st.caption(
    "Cada disciplina tem uma quantidade de **horas por ciclo** alocada. A cada volta completa "
    "do ciclo você estuda cada disciplina pelo seu tempo, na ordem definida abaixo. O círculo "
    "mostra a proporção de cada disciplina no ciclo."
)

disciplinas = cache.list_disciplinas()
ciclo_db = cache.list_ciclo()
por_id = {d["id"]: d for d in disciplinas}
nome_por_id = {d["nome"]: d["id"] for d in disciplinas}
id_por_nome = {d["id"]: d["nome"] for d in disciplinas}
horas_por_id = {c["id"]: c["horas"] for c in ciclo_db}
db_ids = [c["id"] for c in ciclo_db] or [d["id"] for d in disciplinas]

if not ciclo_db:
    repository.save_ciclo_ordem(db_ids)
    st.cache_data.clear()
    ciclo_db = cache.list_ciclo()
    horas_por_id = {c["id"]: c["horas"] for c in ciclo_db}

N = len(disciplinas)
nomes = [d["nome"] for d in disciplinas]

if "ciclo_perm" not in st.session_state:
    st.session_state["ciclo_perm"] = {i + 1: id_por_nome[did] for i, did in enumerate(db_ids)}

flash = st.session_state.pop("_ciclo_flash", None)
if flash:
    st.success(flash)

if st.session_state.pop("_ciclo_resync", False):
    for n in range(1, N + 1):
        st.session_state.pop(f"ciclo_pos_{n}", None)


st.subheader(":material/tune: Ordem do ciclo")
st.caption(
    "Escolha a disciplina de cada posição da rotação. Edite livremente as posições e, ao "
    "clicar em **Confirmar ordem**, a nova ordem é aplicada. Se uma disciplina ficar em mais "
    "de uma posição, a ordem é ajustada automaticamente."
)

perm = st.session_state["ciclo_perm"]
with st.form("form_ordem"):
    cols_ord = st.columns(5)
    for n in range(1, N + 1):
        with cols_ord[(n - 1) // 2]:
            st.selectbox(
                f"Posição {n}",
                nomes,
                index=nomes.index(perm[n]),
                key=f"ciclo_pos_{n}",
            )
    enviado = st.form_submit_button(":material/check: Confirmar ordem", type="primary")

if enviado:
    submetido = [st.session_state[f"ciclo_pos_{n}"] for n in range(1, N + 1)]
    antigo = [perm[n] for n in range(1, N + 1)]
    resolvido = resolver_permutacao(antigo, submetido)
    nova_ordem_ids = [nome_por_id[nome] for nome in resolvido]
    if nova_ordem_ids != db_ids:
        repository.save_ciclo_ordem(nova_ordem_ids)
        st.cache_data.clear()
        db_ids = nova_ordem_ids
        st.session_state["ciclo_perm"] = {i + 1: resolvido[i] for i in range(N)}
        st.session_state["_ciclo_flash"] = "Ordem do ciclo atualizada."
        st.session_state["_ciclo_ordem_mudou"] = True
        st.session_state["_ciclo_resync"] = True
        st.rerun()
    else:
        st.info("A ordem já está como configurada.")

ciclo_atual = montar_ciclo(disciplinas, horas_por_id, db_ids)

col_hr, col_res = st.columns([2, 1], gap="large")

with col_hr:
    st.subheader(":material/timer: Horas por ciclo")
    st.caption("Tempo estudado de cada disciplina a cada volta completa do ciclo.")
    if st.session_state.pop("_ciclo_ordem_mudou", False):
        st.session_state.pop("horas_editor", None)
    df_horas = pd.DataFrame(
        [{"nome": c["nome"], "horas": c["horas"]} for c in ciclo_atual],
        index=[c["id"] for c in ciclo_atual],
    )
    editado = st.data_editor(
        df_horas,
        key="horas_editor",
        hide_index=True,
        width="stretch",
        disabled=["nome"],
        column_config={
            "nome": "Disciplina",
            "horas": st.column_config.NumberColumn(
                "Horas por ciclo",
                min_value=0.5,
                max_value=60.0,
                step=0.5,
                format="%.1f h",
            ),
        },
    )
    if editado is not None and not editado.equals(df_horas):
        novo_horas = {int(i): float(h) for i, h in editado["horas"].items()}
        repository.save_ciclo_horas(novo_horas, ordem_default=db_ids)
        st.cache_data.clear()
        horas_por_id.update(novo_horas)
        ciclo_atual = montar_ciclo(disciplinas, horas_por_id, db_ids)
        st.success(":material/check_circle: Horas do ciclo atualizadas.")

with col_res:
    if ciclo_atual:
        st.subheader(":material/query_stats: Resumo")
        total = sum(c["horas"] for c in ciclo_atual)
        st.metric(
            "Horas por ciclo completo",
            fmt_horas(total),
            help="Soma das horas alocadas a todas as disciplinas.",
        )
        st.metric(
            "Disciplinas no ciclo",
            len(ciclo_atual),
            help="Quantidade de disciplinas na rotação.",
        )
        st.metric(
            "Média por disciplina",
            fmt_horas(total / len(ciclo_atual)),
            help="Horas totais ÷ disciplinas.",
        )

if ciclo_atual:
    st.subheader(":material/donut_large: O ciclo")
    st.plotly_chart(charts.fig_ciclo(ciclo_atual), width="stretch")
    st.caption(
        "O ciclo gira no sentido horário na ordem da lista: estude cada disciplina pelas horas "
        "alocadas e, ao terminar a última, o ciclo recomeça na primeira."
    )

    st.subheader(":material/format_list_numbered: Sequência do ciclo")
    linhas = []
    acum = 0.0
    for pos, c in enumerate(ciclo_atual, start=1):
        linhas.append(
            {
                "#": pos,
                "Disciplina": c["nome"],
                "Início (h)": acum,
                "Fim (h)": acum + c["horas"],
                "Horas": c["horas"],
            }
        )
        acum += c["horas"]
    seq = pd.DataFrame(linhas)
    st.dataframe(
        seq,
        width="stretch",
        hide_index=True,
        column_config={
            "#": "#",
            "Disciplina": "Disciplina",
            "Início (h)": st.column_config.NumberColumn("Início (h)", format="%.1f"),
            "Fim (h)": st.column_config.NumberColumn("Fim (h)", format="%.1f"),
            "Horas": st.column_config.NumberColumn("Horas", format="%.1f"),
        },
    )
    st.caption(
        "Ao longo do ciclo, a posição avança pelo tempo: ex., com 6h de Português no início, "
        "você está na disciplina correspondente àquele intervalo."
    )
