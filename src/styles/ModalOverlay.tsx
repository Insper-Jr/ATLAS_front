import { forwardRef, type ComponentPropsWithoutRef } from "react";
import styled from "styled-components";
import { theme } from "@/styles/theme";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";

const OverlayBase = styled.div`
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.md};
  background: ${theme.colors.veu};
`;

/**
 * O véu do modal. Além do estilo, TRAVA a rolagem do `<body>` enquanto está
 * montado (2026-09-10, a pedido): sem isso dava para rolar a página escondida
 * atrás do card. Como TODO modal do app monta este overlay, o conserto vale
 * para todos de uma vez — nenhum call site muda.
 *
 * ⚠ Fica num `.tsx` separado, e não em `modal.styled.ts`, porque é o único
 * "styled" do chrome que virou componente de verdade (hook dentro).
 */
export const ModalOverlay = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<"div">>(
  function ModalOverlay(props, ref) {
    useLockBodyScroll();
    return <OverlayBase ref={ref} {...props} />;
  },
);
