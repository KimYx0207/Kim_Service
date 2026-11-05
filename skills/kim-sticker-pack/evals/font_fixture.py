"""Synthetic test-only font. Boxes map to Chinese code points but are NOT Chinese glyphs.
Never use this fixture as artwork or evidence of readable Chinese typography.
"""
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

def build_fixture_font(path):
    names=['.notdef','test_box_a','test_box_b']
    builder=FontBuilder(1000,isTTF=True)
    builder.setupGlyphOrder(names)
    builder.setupCharacterMap({ord('收'):'test_box_a',ord('到'):'test_box_b'})
    glyphs={}
    for index,name in enumerate(names):
        pen=TTGlyphPen(None)
        left=80+index*50
        pen.moveTo((left,0));pen.lineTo((900,0));pen.lineTo((900,700-index*40));pen.lineTo((left,700-index*40));pen.closePath()
        glyphs[name]=pen.glyph()
    builder.setupGlyf(glyphs)
    builder.setupHorizontalMetrics({name:(1000,0) for name in names})
    builder.setupHorizontalHeader(ascent=800,descent=-200)
    builder.setupNameTable({'familyName':'Sticker Test Geometry ONLY','styleName':'Regular','uniqueFontIdentifier':'StickerTestGeometryOnly-1','fullName':'Sticker Test Geometry ONLY','psName':'StickerTestGeometryOnly','version':'Version 1.0'})
    builder.setupOS2(sTypoAscender=800,sTypoDescender=-200,usWinAscent=800,usWinDescent=200)
    builder.setupPost();builder.setupMaxp();builder.save(path)
    return path
