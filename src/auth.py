import streamlit as st
from urllib.parse import urlparse

_HOSTS_LOCAIS = {"localhost", "127.0.0.1", "0.0.0.0", "::1"}


def rodando_local():
    try:
        url = getattr(st.context, "url", "") or ""
        host = (urlparse(url).hostname or "").lower()
        if host in _HOSTS_LOCAIS:
            return True
        headers = st.context.headers or {}
        host = (headers.get("Host", "") or "").split(":")[0].lower()
        return host in _HOSTS_LOCAIS
    except AttributeError:
        return False


def verificar_acesso():
    if rodando_local():
        return
    if not st.user.is_logged_in:
        st.title("Acesso restrito")
        st.write("Este painel é privado. Entre com sua conta Google para continuar.")
        st.button("Entrar com Google", on_click=st.login)
        st.stop()

    email = getattr(st.user, "email", None)
    if not email:
        st.error("Não foi possível identificar o e-mail da sua conta.")
        st.button("Sair", on_click=st.logout)
        st.stop()

    permitidos = st.secrets.get("authz", {}).get("allowed_emails", [])
    if email not in permitidos:
        st.title("Acesso negado")
        st.write(f"A conta **{email}** não está autorizada a acessar este painel.")
        st.button("Sair", on_click=st.logout)
        st.stop()

    with st.sidebar:
        st.markdown("---")
        st.caption(f":material/account_circle: {email}")
        st.button(":material/logout: Sair", on_click=st.logout)