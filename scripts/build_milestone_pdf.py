from pathlib import Path
from html import escape
from reportlab.platypus import SimpleDocTemplate, Paragraph, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
import shutil
import pypdfium2 as pdfium
base=Path(__file__).resolve().parents[1]
out=base/'submission'
out.mkdir(exist_ok=True)
styles=getSampleStyleSheet()
styles['Normal'].fontSize=10
styles['Normal'].leading=14
styles['Normal'].spaceAfter=8
styles.add(ParagraphStyle(name='Cell',fontSize=9,leading=12))
story=[]
lines=(base/'docs/milestone-01-submission.md').read_text(encoding='utf-8').splitlines()
i=0
while i<len(lines):
    line=lines[i].strip()
    if not line:
        i+=1
        continue
    if line.startswith('|'):
        rows=[]
        while i<len(lines) and lines[i].strip().startswith('|'):
            cells=[x.strip() for x in lines[i].strip().strip('|').split('|')]
            if not all(set(x)<=set('-: ') for x in cells):
                rows.append([Paragraph(escape(x),styles['Cell']) for x in cells])
            i+=1
        t=Table(rows,colWidths=[58,108,338],repeatRows=1,hAlign='LEFT')
        t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#e9eef4')),('VALIGN',(0,0),(-1,-1),'TOP'),('GRID',(0,0),(-1,-1),.4,colors.HexColor('#b8c1ca')),('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7)]))
        story.append(t)
        continue
    if line in ['## Abstract','## Initial product backlog','## Ethical considerations']:
        story.append(PageBreak())
    if line.startswith('# '):
        story.append(Paragraph(escape(line[2:]),styles['Title']))
    elif line.startswith('### '):
        story.append(Paragraph(escape(line[4:]),styles['Heading3']))
    elif line.startswith('## '):
        story.append(Paragraph(escape(line[3:]),styles['Heading2']))
    else:
        story.append(Paragraph(escape(line),styles['Normal']))
    i+=1
def footer(canvas,doc):
    canvas.setFont('Helvetica',8)
    canvas.drawString(54,30,'HealthTrack | CP317B | Draft - team details pending')
    canvas.drawRightString(558,30,str(doc.page))
SimpleDocTemplate(str(out/'Group4-Milestone01.pdf'),pagesize=letter,rightMargin=54,leftMargin=54,topMargin=48,bottomMargin=48,title='HealthTrack - Milestone 01',author='CP317B Group 4').build(story,onFirstPage=footer,onLaterPages=footer)
shutil.copyfile(Path('C:/Users/colby/Downloads/blog.xlsx'),out/'Group4-Blog.xlsx')
preview=base/'tmp/pdf-preview'
preview.mkdir(parents=True,exist_ok=True)
pdf=pdfium.PdfDocument(str(out/'Group4-Milestone01.pdf'))
for n in range(len(pdf)):
    pdf[n].render(scale=1.2).to_pil().save(preview/f'page-{n+1}.png')
print(f'Generated {len(pdf)} PDF pages; copied unmodified Excel template.')
