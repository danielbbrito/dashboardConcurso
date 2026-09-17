"""Matérias e submatérias extraídas do item 18.2 (objetos de avaliação) do
Edital nº 1 de Abertura do concurso BCB 2024 (págs. 33–35), para o cargo
Analista – Tecnologia da Informação.

Estrutura: nome da disciplina (igual à tabela `disciplinas`) -> lista de
(matéria, [submatérias]).
"""

SIMULADO = "Simulado"

MATERIAS_POR_DISCIPLINA = {
    "Língua Portuguesa": [
        ("Compreensão e interpretação de textos de gêneros variados", []),
        ("Reconhecimento de tipos e gêneros textuais", []),
        ("Domínio da ortografia oficial", []),
        (
            "Domínio dos mecanismos de coesão textual",
            [
                "Emprego de elementos de referenciação, substituição e repetição, de "
                "conectores e de outros elementos de sequenciação textual",
                "Emprego de tempos e modos verbais",
            ],
        ),
        (
            "Domínio da estrutura morfossintática do período",
            [
                "Emprego das classes de palavras",
                "Relações de coordenação entre orações e entre termos da oração",
                "Relações de subordinação entre orações e entre termos da oração",
                "Emprego dos sinais de pontuação",
                "Concordância verbal e nominal",
                "Regência verbal e nominal",
                "Emprego do sinal indicativo de crase",
                "Colocação dos pronomes átonos",
            ],
        ),
        (
            "Reescrita de frases e parágrafos do texto",
            [
                "Significação das palavras",
                "Substituição de palavras ou de trechos de texto",
                "Reorganização da estrutura de orações e de períodos do texto",
                "Reescrita de textos de diferentes gêneros e níveis de formalidade",
            ],
        ),
    ],
    "Noções de Lógica e Estatística": [
        (
            "Raciocínio lógico",
            [
                "Estruturas lógicas",
                "Lógica de argumentação: analogias, inferências, deduções e conclusões",
            ],
        ),
        (
            "Lógica sentencial (ou proposicional)",
            [
                "Proposições simples e compostas",
                "Tabelas-verdade",
                "Equivalências",
                "Leis de Morgan; problemas",
            ],
        ),
        (
            "Noções de estatística",
            [
                "População e amostra",
                "Histogramas e curvas de frequência",
                "Medidas de posição: média, moda, mediana e separatrizes",
                "Medidas de dispersão absoluta e relativa",
                "Probabilidade condicional, independência",
                "Variável aleatória e funções de distribuição",
            ],
        ),
    ],
    "Direito Administrativo": [
        (
            "Administração pública: princípios básicos",
            ["Administração direta e indireta"],
        ),
        (
            "Poderes administrativos",
            [
                "Espécies de poder: hierárquico, disciplinar, regulamentar, de polícia e normativo",
                "Uso e abuso do poder",
            ],
        ),
        (
            "Organização administrativa brasileira",
            [
                "Serviços públicos: conceito e princípios",
                "Autarquias, agências reguladoras, agências executivas, fundações públicas, "
                "empresas públicas, sociedades de economia mista",
            ],
        ),
        (
            "Ato administrativo",
            [
                "Conceito, requisitos e atributos",
                "Comunicação dos atos administrativos",
                "Anulação, revogação e convalidação",
                "Discricionariedade e vinculação",
            ],
        ),
        (
            "Servidores públicos: cargo, emprego e função públicos",
            [
                "Lei nº 8.112/1990 (Regime Jurídico dos Servidores Públicos Civis da União) e alterações",
                "Disposições preliminares",
                "Provimento, vacância, remoção, redistribuição e substituição",
                "Direitos e vantagens",
                "Regime disciplinar",
                "Seguridade social do servidor: aposentadoria e pensão civil",
                "Processo administrativo disciplinar",
            ],
        ),
        ("Improbidade administrativa", []),
        (
            "Código de Ética Profissional do Servidor Público Civil do Poder Executivo Federal "
            "(Decreto nº 1.171/1994)",
            [],
        ),
        ("Código de Conduta da Alta Administração Federal", []),
        ("Lei de conflito de interesses (Lei nº 11.813/2013)", []),
        ("Lei de Acesso à Informação (Lei nº 12.527/2011)", []),
        ("Lei nº 13.709/2018 (Lei Geral de Proteção de Dados Pessoais)", []),
    ],
    "Fundamentos de Macro e Microeconomia": [
        (
            "Macroeconomia",
            [
                "Contas nacionais",
                "Agregados monetários",
                "Multiplicador monetário, criação e destruição de moeda",
                "Contas do sistema monetário",
                "Balanço de pagamentos",
            ],
        ),
        (
            "Microeconomia",
            [
                "Estrutura de mercado",
                "Formas de organização da atividade econômica, o papel dos preços, custo de "
                "oportunidade e fronteiras das possibilidades de produção",
                "Oferta e demanda",
                "Curvas de indiferença",
                "Restrição orçamentária",
                "Equilíbrio do consumidor",
                "Efeitos preço, renda e substituição",
                "Curva de demanda",
                "Elasticidade da demanda",
            ],
        ),
    ],
    "Ciência de Dados": [
        ("Aprendizado de Máquina", []),
        ("Deep learning", []),
        ("Processamento de linguagem natural", []),
        ("Big data", []),
        ("Qualidade de Dados", []),
        (
            "Tipos de Aprendizado: Supervisionado, Não Supervisionado, Semi Supervisionado, "
            "Por Reforço, Por Transferência",
            [],
        ),
        ("Grandes Modelos de Linguagem (LLM), IA Generativa", []),
        ("Redes Neurais", []),
        (
            "MLOps: Gestão de código, treinamento, implantação, monitoramento e versionamento "
            "de modelos, automação do ciclo de produção",
            [],
        ),
        (
            "Governança e Ética na IA: Transparência, Responsabilidade, Explicabilidade, "
            "Privacidade, Segurança, Viés",
            [],
        ),
    ],
    "Segurança da Informação": [
        (
            "Gestão de Identidades e Acesso: Autenticação e Autorização, Single Sign-On (SSO), "
            "Security Assertion Markup Language (SAML), OAuth2 e OpenId Connect",
            [],
        ),
        ("Privacidade e segurança por padrão", []),
        ("Principais tipos de ataques e vulnerabilidades", []),
        ("Controles e testes de segurança para aplicações Web e Web Services", []),
        ("Múltiplos Fatores de Autenticação (MFA)", []),
        (
            "Soluções para Segurança da Informação: Firewall, Intrusion Detection System (IDS), "
            "Intrusion Prevention System (IPS), Security Information and Event Management (SIEM), "
            "Proxy, Identity Access Management (IAM), Privileged Access Management (PAM), "
            "Antivírus, Antispam",
            [],
        ),
        (
            "Frameworks de segurança da informação e segurança cibernética, como, por exemplo, "
            "MITRE ATT&CK, CIS Controls e NIST CyberSecurity Framework (NIST CSF)",
            [],
        ),
        ("Tratamento de Incidentes Cibernéticos", []),
        (
            "Assinatura e certificação digital, criptografia e proteção de dados em trânsito e "
            "em repouso",
            [],
        ),
        ("Segurança em nuvens e de contêineres", []),
    ],
    "Engenharia de Software": [
        (
            "Arquitetura de sistemas web: protocolo HTTP, HTTP/2, gRPC, WebSockets, TLS, "
            "servidores proxy, cache, DNS, balanceamento de carga, tolerância a falhas e "
            "escalabilidade em sistemas web",
            [],
        ),
        (
            "Princípios e práticas de DevOps e DevSecOps, integração e entrega contínuas (CI/CD)",
            [],
        ),
        ("Técnicas de desenvolvimento seguro", []),
        ("Testes de software: Testes unitários, Testes de Integração, TDD, BDD", []),
        (
            "Arquiteturas em camadas, baseada em serviços, microsserviços (orquestração de "
            "serviços e API gateway), orientação a eventos, cliente-servidor, serverless",
            [],
        ),
        ("Práticas de UX e UI design", []),
        ("Programação assíncrona", []),
        ("RESTful e GraphQL", []),
        ("Web services", []),
        ("Padrões: GoF e GRASP", []),
        ("Git", []),
        ("Python e Java", []),
        ("Transações distribuídas", []),
        ("Distributed Ledger Technology (DLT)", []),
    ],
    "Infraestrutura em TI": [
        ("Conceitos de infraestrutura como código e automação de infraestrutura de TI", []),
        (
            "Docker, Kubernetes: boas práticas para infraestrutura e orquestração de containers",
            [],
        ),
        (
            "Serviços de Rede Microsoft Windows Server: DNS, DHCP, Radius, Autenticação, "
            "Certificados, Active Directory (AD)",
            [],
        ),
        (
            "Monitoração, observabilidade e análise de sistemas em produção por meio do uso de "
            "ferramentas de monitoramento e logging, como o Nagios, Prometheus, Grafana, "
            "Elasticsearch, Kibana, Application Performance Monitoring (APM), entre outras",
            [],
        ),
        (
            "Protocolos da camada de aplicação, como Simple Mail Transfer Protocol (SMTP), "
            "Hypertext Transfer Protocol (HTTP), Hypertext Transfer Protocol (HTTPS), SSL/TLS, "
            "Lightweight Directory Access Protocol (LDAP), Network File System (NFS), Server "
            "Message Block (SMB)",
            [],
        ),
        ("Tolerância a falhas e continuidade de operação", []),
        (
            "Implantação e administração de serviços de nuvem (IaaS, PaaS e SaaS)",
            [],
        ),
        ("Administração e gerenciamento de ambientes de virtualização", []),
        (
            "Administração e operação de sistemas operacionais Microsoft Windows Server e Linux",
            [],
        ),
        ("Conceitos de LAN, WAN e SDN", []),
        (
            "Conceitos e ferramentas de orquestração e automação de infraestrutura: Puppet, "
            "Ansible",
            [],
        ),
    ],
    "Bancos de Dados": [
        ("SGBDs SQL e NOSQL", []),
        ("Modelagens de dados: relacional, multidimensional, nosql", []),
        ("SQL (Procedural Language / Structured Query Language)", []),
        (
            "Arquitetura de Inteligência de Negócio: DataWarehouse, DataMart, DataLake, DataMesh",
            [],
        ),
    ],
    "Gestão em TI": [
        ("Kanban", []),
        ("Scrum", []),
        ("Governança de Dados", []),
        ("ITIL v4", []),
    ],
}


def materias_de(disciplina_nome):
    return [nome for nome, _ in MATERIAS_POR_DISCIPLINA.get(disciplina_nome, [])]


def submaterias_de(disciplina_nome, materia):
    for nome, subs in MATERIAS_POR_DISCIPLINA.get(disciplina_nome, []):
        if nome == materia:
            return list(subs)
    return []