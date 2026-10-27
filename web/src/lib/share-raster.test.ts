import { describe, expect, it } from 'vitest'
import { pictureSize } from './share-raster'

describe('the size a picture is rasterised at', () => {
  it('is its own viewBox, whatever the shape of the card', () => {
    expect(pictureSize('<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1500" viewBox="0 0 1080 1500" role="img"></svg>')).toEqual({ width: 1080, height: 1500 })
    expect(pictureSize('<svg viewBox="0 0 1200 630"></svg>')).toEqual({ width: 1200, height: 630 })
  })
  it('falls back to the share card when there is none', () => {
    expect(pictureSize('<svg></svg>')).toEqual({ width: 1080, height: 1070 })
  })
})
