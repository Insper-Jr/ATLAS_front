import { useEffect, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import { useAuth } from "@/context/AuthContext";
import { getVendidosRecentes } from "@/lib/contratos";
import type { ProjetoVendidoRecente } from "@/types/contratos";
import { theme } from "@/styles/theme";

/**
 * ⭐ 2026-11-05 — a pedido: contrato assinado vira projeto Vendido e, pelas
 * 36 horas seguintes, quem abre o ATLAS vê confetes e o nome do projeto.
 * A lista vem do backend (`/projetos/vendidos-recentes`, pelo histórico de
 * status); aqui só se desenha. Roda uma vez por abertura do app (montagem
 * do Layout), não a cada troca de página.
 *
 * Os confetes são um canvas próprio, sem biblioteca: ~150 partículas por
 * uns 4 segundos, e o canvas some sozinho. Quem prefere menos movimento
 * (`prefers-reduced-motion`) vê só o aviso, sem a chuva.
 */

const DURACAO_MS = 4500;
const CORES = ["#e11d48", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#f97316", "#facc15"];

const Canvas = styled.canvas`
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 9999;
`;

const surgir = keyframes`
  from { opacity: 0; transform: translate(-50%, -12px); }
  to { opacity: 1; transform: translate(-50%, 0); }
`;

const Aviso = styled.div`
  position: fixed;
  top: 1.25rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10000;
  max-width: min(92vw, 34rem);
  padding: 0.875rem 1.25rem;
  border-radius: ${theme.borderRadius.lg};
  background: ${theme.colors.primary};
  color: #fff;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  animation: ${surgir} 0.4s ease-out;
  font-size: ${theme.fontSize.sm};

  strong {
    font-size: 1rem;
  }

  button {
    margin-left: auto;
    background: transparent;
    border: 0;
    color: inherit;
    font-size: 1.1rem;
    cursor: pointer;
    line-height: 1;
  }
`;

type Particula = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
  w: number;
  h: number;
  cor: string;
};

function soltarConfetes(canvas: HTMLCanvasElement, aoTerminar: () => void) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.scale(dpr, dpr);
  const largura = window.innerWidth;
  const altura = window.innerHeight;

  const particulas: Particula[] = Array.from({ length: 160 }, (_, i) => {
    const daEsquerda = i % 2 === 0;
    return {
      x: daEsquerda ? largura * 0.1 : largura * 0.9,
      y: altura * 0.75,
      vx: (daEsquerda ? 1 : -1) * (4 + Math.random() * 7),
      vy: -(10 + Math.random() * 10),
      rot: Math.random() * Math.PI,
      vrot: (Math.random() - 0.5) * 0.3,
      w: 6 + Math.random() * 6,
      h: 4 + Math.random() * 4,
      cor: CORES[Math.floor(Math.random() * CORES.length)],
    };
  });

  const inicio = performance.now();
  let quadro = 0;
  function desenhar(agora: number) {
    const t = agora - inicio;
    ctx!.clearRect(0, 0, largura, altura);
    const desvanecer = t > DURACAO_MS - 1000 ? Math.max(0, (DURACAO_MS - t) / 1000) : 1;
    for (const p of particulas) {
      p.vy += 0.25;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vrot;
      ctx!.save();
      ctx!.globalAlpha = desvanecer;
      ctx!.translate(p.x, p.y);
      ctx!.rotate(p.rot);
      ctx!.fillStyle = p.cor;
      ctx!.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx!.restore();
    }
    if (t < DURACAO_MS) {
      quadro = requestAnimationFrame(desenhar);
    } else {
      ctx!.clearRect(0, 0, largura, altura);
      aoTerminar();
    }
  }
  quadro = requestAnimationFrame(desenhar);
  return () => cancelAnimationFrame(quadro);
}

export function CelebracaoVenda() {
  const { token } = useAuth();
  const [vendidos, setVendidos] = useState<ProjetoVendidoRecente[]>([]);
  const [mostrarConfetes, setMostrarConfetes] = useState(false);
  const [fechado, setFechado] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!token) return;
    let vivo = true;
    getVendidosRecentes(token)
      .then(({ projetos }) => {
        if (!vivo || projetos.length === 0) return;
        setVendidos(projetos);
        const reduzido = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        if (!reduzido) setMostrarConfetes(true);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [token]);

  useEffect(() => {
    if (!mostrarConfetes || !canvasRef.current) return;
    return soltarConfetes(canvasRef.current, () => setMostrarConfetes(false));
  }, [mostrarConfetes]);

  if (vendidos.length === 0 || fechado) return null;

  const nomes = vendidos.map((p) => p.nome);
  const texto =
    nomes.length === 1
      ? nomes[0]
      : `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;

  return (
    <>
      {mostrarConfetes && <Canvas ref={canvasRef} aria-hidden />}
      <Aviso role="status">
        <span>
          <strong>{vendidos.length === 1 ? "Projeto vendido!" : "Projetos vendidos!"}</strong>
          <br />
          {texto}
        </span>
        <button type="button" aria-label="Fechar" onClick={() => setFechado(true)}>
          ×
        </button>
      </Aviso>
    </>
  );
}
