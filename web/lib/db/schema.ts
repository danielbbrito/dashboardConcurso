import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

// The web app intentionally uses the Streamlit schema as its single-user store.
export const disciplines = sqliteTable("disciplinas", {
  id: integer("id").primaryKey(),
  name: text("nome").notNull(),
  block: text("bloco").notNull(),
  examItems: integer("itens_prova").notNull(),
  displayOrder: integer("ordem").notNull(),
});

export const questionSessions = sqliteTable("registros", {
  id: integer("id").primaryKey(),
  studyDate: text("data").notNull(),
  disciplineId: integer("disciplina_id").notNull(),
  questionsAttempted: integer("feitas").notNull(),
  correctAnswers: integer("acertos").notNull(),
  guesses: integer("chutes").notNull(),
  correctGuesses: integer("chutes_certos").notNull(),
  difficulty: text("dificuldade"),
  topic: text("materia"),
  subtopic: text("submateria"),
  createdAt: text("criado_em"),
});

export const disciplineNotes = sqliteTable("anotacoes", {
  disciplineId: integer("disciplina_id").primaryKey(),
  body: text("texto").notNull(),
  updatedAt: text("atualizado_em"),
});

export const studyHours = sqliteTable("horas_estudo", {
  id: integer("id").primaryKey(),
  studyDate: text("data").notNull(),
  hours: real("horas").notNull(),
  createdAt: text("criado_em"),
});

export const studiedTopics = sqliteTable("materias", {
  id: integer("id").primaryKey(),
  studyDate: text("data").notNull(),
  disciplineId: integer("disciplina_id").notNull(),
  topic: text("materia").notNull(),
  subtopic: text("submateria"),
  createdAt: text("criado_em"),
});

export const studyCycleEntries = sqliteTable("ciclo_estudos", {
  id: integer("id").primaryKey(),
  disciplineId: integer("disciplina_id").notNull(),
  position: integer("posicao").notNull(),
  hours: real("horas").notNull(),
});
