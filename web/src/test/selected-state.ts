import { screen } from '@testing-library/react'

/** The "RJ · selecionado" line of a map panel (#184): the state is a link, so the sentence is split across two elements and is read by the text of its paragraph. */
export const selectedState = (uf: string): HTMLElement => screen.getByText((_, el) => el?.tagName === 'P' && el.textContent === `${uf} · selecionado`)
