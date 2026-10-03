"""Export the complete editable book and an offline HTML reading edition."""
import html

def export_full(book,aux,sources,title,root):
    md=['# '+title,'第二版 · 系统设计与操作使用 · 2026-10-04','![封面架构图](assets/cover.svg)']
    web=[];nav=[]
    def e(value):return html.escape(str(value)).replace('\n','<br>')
    def heading(text,level,anchor):
        md.append('#'*level+' '+text)
        web.append(f'<h{level} id="{anchor}">{e(text)}</h{level}>')
    def content(p):
        for t in p.get('paragraphs',[]):md.append(t);web.append('<p>'+e(t)+'</p>')
        if p.get('diagram'):
            d=p['diagram'];src='assets/'+d['asset']
            md.append(f'![{d["title"]}]({src})')
            web.append(f'<figure><img loading="lazy" src="{src}" alt="{e(d["title"])}"><figcaption>{e(d["title"])}</figcaption></figure>')
        if p.get('table'):
            t=p['table'];rows=[t['headers'],['---']*len(t['headers']),*t['rows']]
            md.append('\n'.join('|'+'|'.join(str(v).replace('|','\\|').replace('\n','<br>') for v in r)+'|' for r in rows))
            web.append('<table><thead><tr>'+''.join('<th>'+e(v)+'</th>' for v in t['headers'])+'</tr></thead><tbody>'+''.join('<tr>'+''.join('<td>'+e(v)+'</td>' for v in r)+'</tr>' for r in t['rows'])+'</tbody></table>')
        for key in ['code','note']:
            if p.get(key):
                md.append(('```text\n'+p[key]+'\n```') if key=='code' else p[key])
                web.append('<pre>'+e(p[key])+'</pre>')
    for p in aux:
        if p['page']<11:
            anchor='front-'+str(p['page']);heading(p['title'],1,anchor);content(p)
            nav.append(f'<a href="#{anchor}">{e(p["title"])}</a>')
    for c in book:
        label=f'{c["number"]} {c["title"]}';anchor=f'c{c["number"]}'
        heading(label,1,anchor);nav.append(f'<a href="#{anchor}">{e(label)}</a>')
        for i,s in enumerate(c['sections'],1):
            heading(f'{c["number"]}.{i} {s["title"]}',2,f's{c["number"]}-{i}')
            if s.get('scope'):md.append(s['scope']);web.append('<aside>'+e(s['scope'])+'</aside>')
            for j,p in enumerate(s['pages'],1):
                heading(p['title'],3,f'p{p.get("page",0)}');content(p)
            md.append('参考：'+'；'.join(f'[{r}] {sources[r][0]}' for r in s['refs']))
            web.append('<p class="refs">参考：'+'；'.join(f'<a href="#src-{r}">[{r}] {e(sources[r][0])}</a>' for r in s['refs'])+'</p>')
    for p in aux:
        if p['page']>290:
            anchor='appendix-'+str(p['page']);heading(p['title'],1,anchor);content(p)
            nav.append(f'<a href="#{anchor}">{e(p["title"])}</a>')
    heading('参考资料完整索引',1,'sources');nav.append('<a href="#sources">参考资料完整索引</a>')
    for key,(label,url) in sources.items():
        md.append(f'[{key}] {label} — {url}')
        target=f'<a href="{html.escape(url,quote=True)}">{e(url)}</a>' if url.startswith('https://') else e(url)
        web.append(f'<p id="src-{key}">[{key}] {e(label)}<br>{target}</p>')
    (root/'说明书_可编辑正文.md').write_text('\n\n'.join(md)+'\n','utf-8')
    css='body{margin:0;color:#17334f;background:#f5f7f9;font:17px/1.8 "Microsoft YaHei",sans-serif}nav{position:fixed;top:0;bottom:0;width:245px;padding:26px 18px;background:#17334f;overflow:auto}nav a{display:block;color:#dce8f2;text-decoration:none;font-size:13px;margin:9px 0}main{margin-left:285px;max-width:920px;padding:50px;background:white}h1{font-size:32px;margin-top:75px}h2{font-size:24px;margin-top:52px}h3{font-size:19px;margin-top:32px}p{text-align:justify}figure{margin:26px 0}img{display:block;width:100%;height:auto}figcaption,.refs{font-size:13px;color:#54677a}table{border-collapse:collapse;width:100%;font-size:14px}th,td{padding:12px;text-align:left;vertical-align:top;border-bottom:1px solid #cbd7df}th{background:#dfeaf1}pre,aside{white-space:pre-wrap;background:#edf4f8;padding:16px;font-size:14px}a{color:#285f86;overflow-wrap:anywhere}@media(max-width:900px){nav{position:static;width:auto}main{margin:0;padding:25px}}'
    doc='<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>'+e(title)+'</title><style>'+css+'</style></head><body><nav><h2 style="color:white">A330 EFB</h2>'+''.join(nav)+'</nav><main><h1>'+e(title)+'</h1><p>第二版 · 系统设计与操作使用 · 2026-10-04</p><figure><img src="assets/cover.svg" alt="系统概览"></figure>'+''.join(web)+'</main></body></html>'
    (root/'说明书_网页阅读版.html').write_text(doc,'utf-8')
