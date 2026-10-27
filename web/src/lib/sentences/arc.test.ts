import { describe, expect, it } from 'vitest'
import { ARC_KINDS, type Arc } from '../arcs'
import { arcLabel } from './arc'

const STANDARD: [Arc, string][] = [
  [{ kind: 'same' }, 'Mesmo lado nos três ciclos'],
  [{ kind: 'switched2022' }, 'Mudou de lado em 2022'],
  [{ kind: 'switched2026' }, 'Mudou de lado em 2026'],
  [{ kind: 'returned' }, 'Mudou de lado em 2022 e voltou em 2026'],
  [{ kind: 'switchedTwice' }, 'Mudou de lado em 2022 e de novo em 2026'],
  [{ kind: 'tie', years: [2022] }, 'Empate no 2º turno de 2022'],
  [{ kind: 'tie', years: [2018, 2026] }, 'Empate no 2º turno de 2018 e 2026'],
  [{ kind: 'missing', years: [2018, 2022] }, 'Sem dados do 2º turno de 2018 e 2022'],
]
const PLAIN: [Arc, string][] = [
  [{ kind: 'same' }, 'Nos três ciclos, o mesmo lado teve mais votos no 2º turno'],
  [{ kind: 'switched2022' }, 'Em 2022, o lado com mais votos no 2º turno mudou'],
  [{ kind: 'switched2026' }, 'Em 2026, o lado com mais votos no 2º turno mudou'],
  [{ kind: 'returned' }, 'Em 2022 o lado com mais votos mudou, e em 2026 voltou a ser o de 2018'],
  [{ kind: 'switchedTwice' }, 'O lado com mais votos no 2º turno mudou em 2022 e mudou de novo em 2026'],
  [{ kind: 'tie', years: [2018, 2022, 2026] }, 'O 2º turno terminou empatado em 2018, 2022 e 2026'],
  [{ kind: 'missing', years: [2018] }, 'Não temos o resultado do 2º turno de 2018'],
]

describe('arc label: one template per kind, standard register', () => {
  it.each(STANDARD)('%j', (arc, text) => {
    expect(arcLabel(arc).label).toBe(text)
  })
  it('says that it describes the sequence, not the cause', () => {
    expect(arcLabel({ kind: 'same' }).note).toBe('Descreve a sequência, não a causa.')
  })
})

describe('arc label: plain language', () => {
  it.each(PLAIN)('%j', (arc, text) => {
    expect(arcLabel(arc, { register: 'plain' }).label).toBe(text)
  })
  it('the note is short and still not a cause', () => {
    expect(arcLabel({ kind: 'same' }, { register: 'plain' }).note).toBe('Só conta a ordem dos fatos. Não diz o motivo.')
  })
})

describe('the wording is neutral', () => {
  const all = ARC_KINDS.flatMap((kind) => (['standard', 'plain'] as const).map((register) => arcLabel({ kind, years: [2018, 2022] }, { register })))
  it('has a label for every kind of the closed list, with no slot left open', () => {
    expect(all).toHaveLength(ARC_KINDS.length * 2)
    for (const { label, note } of all) expect(label + note).not.toMatch(/\{\w+\}/)
  })
  it('never says why: no cause, no winner or loser word', () => {
    for (const { label } of all) expect(label).not.toMatch(/porque|devido|causa|culpa|motivo|venc|perd|ganh|derrot/i)
  })
  it('every kind of the closed list has a test above', () => {
    const tested = new Set([...STANDARD, ...PLAIN].map(([arc]) => arc.kind))
    expect([...tested].sort()).toEqual([...ARC_KINDS].sort())
  })
  it('an unfinished locale reads in Portuguese, never throws', () => {
    expect(arcLabel({ kind: 'same' }, { locale: 'en' }).label).toBe('Mesmo lado nos três ciclos')
  })
})
