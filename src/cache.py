import streamlit as st

from . import repository


@st.cache_data(ttl=60, show_spinner=False)
def list_disciplinas():
    return repository.list_disciplinas()


@st.cache_data(ttl=60, show_spinner=False)
def list_registros(inicio=None, fim=None, disciplina_ids=None, limit=None):
    return repository.list_registros(inicio, fim, disciplina_ids, limit)


@st.cache_data(ttl=60, show_spinner=False)
def agg_por_disciplina(inicio=None, fim=None, disciplina_ids=None):
    return repository.agg_por_disciplina(inicio, fim, disciplina_ids)


@st.cache_data(ttl=60, show_spinner=False)
def agg_por_dia(inicio=None, fim=None, disciplina_ids=None):
    return repository.agg_por_dia(inicio, fim, disciplina_ids)


@st.cache_data(ttl=60, show_spinner=False)
def get_anotacao(disciplina_id):
    return repository.get_anotacao(disciplina_id)


@st.cache_data(ttl=60, show_spinner=False)
def get_anotacao_atualizado_em(disciplina_id):
    return repository.get_anotacao_atualizado_em(disciplina_id)


@st.cache_data(ttl=60, show_spinner=False)
def list_horas(inicio=None, fim=None, limit=None):
    return repository.list_horas(inicio, fim, limit)


@st.cache_data(ttl=60, show_spinner=False)
def agg_horas_por_dia(inicio=None, fim=None):
    return repository.agg_horas_por_dia(inicio, fim)