import { useEffect, useState } from 'react'
import { codeToHtml } from 'shiki'

import styles from './doc.module.css'

export function CodeBlock({ code, lang = 'ts' }: { code: string; lang?: string }) {
  const [html, setHtml] = useState('')

  useEffect(() => {
    let alive = true
    codeToHtml(code.trim(), { lang, theme: 'github-dark-default' }).then((h) => {
      if (alive) setHtml(h)
    })
    return () => {
      alive = false
    }
  }, [code, lang])

  if (!html) {
    return (
      <div className={styles.code}>
        <pre>
          <code>{code.trim()}</code>
        </pre>
      </div>
    )
  }

  return (
    <div
      className={styles.code}
      // Shiki returns a self-contained <pre>; we style it in doc.module.css.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

export default CodeBlock
