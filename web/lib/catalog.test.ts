import test from "node:test";
import assert from "node:assert/strict";

import { CATALOG_VERSION, DISCIPLINES, TOPIC_CATALOG, topicsForDiscipline } from "./catalog";

test("matches the current ten-discipline catalog", () => {
  assert.equal(CATALOG_VERSION, "bcb-ti-2024-edital-v1");
  assert.equal(DISCIPLINES.length, 10);
  assert.deepEqual(DISCIPLINES.map(({ name }) => name), [
    "Língua Portuguesa",
    "Noções de Lógica e Estatística",
    "Direito Administrativo",
    "Fundamentos de Macro e Microeconomia",
    "Ciência de Dados",
    "Segurança da Informação",
    "Engenharia de Software",
    "Infraestrutura em TI",
    "Bancos de Dados",
    "Gestão em TI",
  ]);
});

test("matches edital topic and subtopic counts", () => {
  const expected = [
    [6, 14],
    [3, 12],
    [11, 16],
    [2, 14],
    [10, 0],
    [10, 0],
    [14, 0],
    [11, 0],
    [4, 0],
    [4, 0],
  ];
  const actual = DISCIPLINES.map(({ id }) => {
    const topics = topicsForDiscipline(id);
    return [topics.length, topics.reduce((sum, [, subtopics]) => sum + subtopics.length, 0)];
  });
  assert.deepEqual(actual, expected);
  assert.equal(Object.keys(TOPIC_CATALOG).length, 10);
});
