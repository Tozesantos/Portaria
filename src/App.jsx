import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

function formatarDuracao(ms) {
  if (ms < 0) ms = 0
  const totalMin = Math.floor(ms / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h > 0) return `${h}h ${m}min`
  return `${m}min`
}

export default function App() {
  const [entradas, setEntradas] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)
  const [agora, setAgora] = useState(Date.now())

  const [nome, setNome] = useState('')
  const [numeroTlm, setNumeroTlm] = useState('')
  const [valorPago, setValorPago] = useState('')

  async function carregar() {
    setLoading(true)
    const { data, error } = await supabase
      .from('entradas')
      .select('*')
      .order('hora_entrada', { ascending: false })
    if (error) setErro(error.message)
    else setEntradas(data)
    setLoading(false)
  }

  useEffect(() => {
    carregar()
  }, [])

  // Atualiza o relógio a cada minuto para o tempo "ao vivo" de quem está dentro.
  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 60000)
    return () => clearInterval(id)
  }, [])

  async function adicionar(e) {
    e.preventDefault()
    if (!nome.trim()) return
    setErro(null)
    const { error } = await supabase.from('entradas').insert({
      nome: nome.trim(),
      numero_tlm: numeroTlm.trim() || null,
      valor_pago: valorPago === '' ? 0 : Number(valorPago),
      saida: false,
    })
    if (error) {
      setErro(error.message)
      return
    }
    setNome('')
    setNumeroTlm('')
    setValorPago('')
    carregar()
  }

  async function alternarSaida(entrada) {
    const vaiSair = !entrada.saida
    const { error } = await supabase
      .from('entradas')
      .update({
        saida: vaiSair,
        hora_saida: vaiSair ? new Date().toISOString() : null,
      })
      .eq('id', entrada.id)
    if (error) setErro(error.message)
    else carregar()
  }

  async function apagar(id) {
    if (!confirm('Apagar este registo?')) return
    const { error } = await supabase.from('entradas').delete().eq('id', id)
    if (error) setErro(error.message)
    else carregar()
  }

  function tempoDentro(e) {
    const inicio = new Date(e.hora_entrada).getTime()
    const fim = e.saida && e.hora_saida ? new Date(e.hora_saida).getTime() : agora
    return formatarDuracao(fim - inicio)
  }

  const dentro = entradas.filter((e) => !e.saida).length
  const totalPago = entradas.reduce((s, e) => s + Number(e.valor_pago || 0), 0)

  return (
    <div className="container">
      <h1>Portaria do Evento</h1>

      <div className="stats">
        <div className="stat">
          <span className="num">{entradas.length}</span>
          <span className="label">Total registos</span>
        </div>
        <div className="stat">
          <span className="num">{dentro}</span>
          <span className="label">Dentro</span>
        </div>
        <div className="stat">
          <span className="num">{totalPago.toFixed(2)} €</span>
          <span className="label">Total recebido</span>
        </div>
      </div>

      <form onSubmit={adicionar} className="form">
        <input
          placeholder="Nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        <input
          placeholder="Nº telemóvel"
          value={numeroTlm}
          onChange={(e) => setNumeroTlm(e.target.value)}
        />
        <input
          type="number"
          step="0.01"
          min="0"
          placeholder="Valor pago (€)"
          value={valorPago}
          onChange={(e) => setValorPago(e.target.value)}
        />
        <button type="submit">Registar entrada</button>
      </form>

      {erro && <p className="erro">Erro: {erro}</p>}

      {loading ? (
        <p>A carregar…</p>
      ) : (
        <table className="tabela">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Telemóvel</th>
              <th>Entrada</th>
              <th>Saída</th>
              <th>Tempo</th>
              <th>Pago</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {entradas.length === 0 && (
              <tr>
                <td colSpan={8} className="vazio">
                  Ainda sem registos.
                </td>
              </tr>
            )}
            {entradas.map((e) => (
              <tr key={e.id} className={e.saida ? 'saiu' : ''}>
                <td data-label="Nome" className="cel-nome">
                  {e.nome}
                </td>
                <td data-label="Telemóvel">{e.numero_tlm || '—'}</td>
                <td data-label="Entrada">
                  {new Date(e.hora_entrada).toLocaleTimeString('pt-PT', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </td>
                <td data-label="Saída">
                  {e.saida && e.hora_saida
                    ? new Date(e.hora_saida).toLocaleTimeString('pt-PT', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—'}
                </td>
                <td data-label="Tempo">{tempoDentro(e)}</td>
                <td data-label="Pago">{Number(e.valor_pago).toFixed(2)} €</td>
                <td data-label="Estado">
                  <button
                    className={e.saida ? 'btn-saiu' : 'btn-dentro'}
                    onClick={() => alternarSaida(e)}
                  >
                    {e.saida ? 'Saiu' : 'Marcar saída'}
                  </button>
                </td>
                <td data-label="" className="cel-apagar">
                  <button className="btn-apagar" onClick={() => apagar(e.id)}>
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
