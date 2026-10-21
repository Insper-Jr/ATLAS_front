import styled, { keyframes, css } from "styled-components";
import { Link } from "react-router-dom";
import { theme } from "@/styles/theme";
import { Button } from "@/components/ui/button";

const loginFadeUp = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
`;

const loginCursorBlink = keyframes`
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
`;

const loginRevealStagger = css`
  & > * {
    opacity: 0;
    animation: ${loginFadeUp} 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }
  & > *:nth-child(1) { animation-delay: 0.06s; }
  & > *:nth-child(2) { animation-delay: 0.14s; }
  & > *:nth-child(3) { animation-delay: 0.22s; }
  & > *:nth-child(4) { animation-delay: 0.3s; }
  & > *:nth-child(5) { animation-delay: 0.38s; }

  @media (prefers-reduced-motion: reduce) {
    & > * { opacity: 1; animation: none; }
  }
`;

export const AuthPageWrapper = styled.div`
  min-height: 100vh;
  display: flex;
`;

export const LoginLeftPanel = styled.div`
  display: none;
  width: 50%;
  position: relative;
  overflow: hidden;
  background: linear-gradient(
    to right,
    color-mix(in srgb, ${theme.colors.primary} 45%, black) 0%,
    ${theme.colors.primary} 100%
  );

  @media (min-width: 1024px) {
    display: flex;
  }
`;

export const LoginLeftPanelContent = styled.div`
  position: relative;
  z-index: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  padding: calc(${theme.spacing["2xl"]} + 4rem) ${theme.spacing["2xl"]} ${theme.spacing["2xl"]};
  gap: 2.25rem;
`;

export const LoginGlobeHalo = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;

  &::before,
  &::after {
    content: "";
    position: absolute;
    pointer-events: none;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 50%;
  }

  &::before { width: 128%; height: 128%; }
  &::after { width: 158%; height: 52%; }
`;

export const LoginHeadline = styled.h1`
  font-size: clamp(2rem, 4vw, 2.75rem);
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.02em;
  color: #ffffff;
  margin: 0;
  margin-top: 2.5rem;
  text-align: center;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
`;

export const LoginHeadlineAccent = styled.span`
  color: #ffd9d9;
`;

export const LoginHeadlineCursor = styled.span`
  display: inline-block;
  width: 3px;
  height: 1em;
  margin-left: 2px;
  vertical-align: text-bottom;
  background: #ffffff;
  animation: ${loginCursorBlink} 0.8s step-end infinite;
`;

export const LoginTagline = styled.p`
  max-width: 32rem;
  font-size: ${theme.fontSize.lg};
  font-weight: 400;
  color: ${theme.colors.mutedForeground};
  line-height: 1.6;
  letter-spacing: 0.01em;
  margin: 0;
`;

export const LoginRightPanel = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.md};
  background: ${theme.colors.background};

  @media (min-width: ${theme.breakpoints.sm}px) {
    padding: ${theme.spacing.xl};
  }
`;

export const LoginFormPanel = styled.div`
  flex: 1;
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.md};
  overflow: hidden;
  background: ${theme.colors.background};
  box-shadow: ${theme.shadows.lg};

  @media (min-width: ${theme.breakpoints.sm}px) {
    padding: ${theme.spacing.xl};
  }
`;

export const LoginFormWrapper = styled.div`
  width: 100%;
  max-width: 28rem;
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xl};
  ${loginRevealStagger};

  & > * { width: 100%; }
`;

export const LoginHeaderBlock = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.125rem;
`;

export const LoginFormLogoWrap = styled.div`
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
  width: 100%;
  margin-top: 0.5rem;

  @media (min-width: ${theme.breakpoints.sm}px) {
    margin-left: -3rem;
    margin-top: 1.5rem;
  }
`;

export const LoginBrandLogo = styled.img`
  display: block;
  max-height: 160px;
  width: auto;
  max-width: 100%;
  object-fit: contain;
  object-position: left center;
  margin: 0;
  padding: 0;
  vertical-align: top;
`;

export const LoginFormSubtitle = styled.p`
  width: 100%;
  color: ${theme.colors.mutedForeground};
  margin: 0;
  padding: 0;
  text-align: left;
`;

export const LoginAuthForm = styled.form`
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: ${theme.spacing.lg};
`;

export const LoginFieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

export const LoginFieldRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

export const LoginForgotLink = styled(Link)`
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.accent};
  text-decoration: none;
  cursor: pointer;

  &:hover { text-decoration: underline; }
`;

export const LoginInputWrapper = styled.div`
  position: relative;

  & input {
    height: 2.75rem;
    border-radius: ${theme.borderRadius.lg};
    padding-left: 2.5rem;
    transition: border-color ${theme.transitions.fast}, box-shadow ${theme.transitions.fast};
  }

  &:focus-within input {
    border-color: ${theme.colors.accent};
    box-shadow: 0 0 0 3px color-mix(in srgb, ${theme.colors.accent} 16%, transparent);
  }
`;

export const LoginInputWrapperWithRight = styled(LoginInputWrapper)`
  & input { padding-right: 2.5rem; }
`;

export const LoginIconWrapper = styled.span`
  position: absolute;
  left: ${theme.spacing.md};
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${theme.colors.mutedForeground};
  pointer-events: none;
`;

export const LoginTogglePasswordBtn = styled.button`
  position: absolute;
  right: ${theme.spacing.md};
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: ${theme.colors.mutedForeground};
  transition: color ${theme.transitions.fast};

  &:hover { color: ${theme.colors.foreground}; }
`;

export const LoginSubmitButton = styled(Button)`
  width: 100%;
  height: 2.75rem;
  gap: 0.5rem;
  background: transparent !important;
  border: 1.5px solid ${theme.colors.accent} !important;
  color: ${theme.colors.accent} !important;
  transition: background ${theme.transitions.fast}, color ${theme.transitions.fast} !important;

  &:hover:not(:disabled) {
    background: ${theme.colors.accent} !important;
    color: #ffffff !important;
  }
`;

export const LoginErrorMessage = styled.p`
  font-size: 0.85rem;
  color: ${theme.colors.destructive};
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  margin: 0;
  text-align: center;
`;

export const LoginSuccessMessage = styled.p`
  font-size: 0.85rem;
  color: ${theme.colors.success};
  background: rgba(34, 197, 94, 0.08);
  border: 1px solid rgba(34, 197, 94, 0.25);
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  margin: 0;
  text-align: center;
  line-height: 1.5;
`;