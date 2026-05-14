"use client";

import {
  App as AntApp,
  Button,
  Form,
  Input,
  Typography,
} from "antd";
import {
  GiftOutlined,
  LockOutlined,
  LoginOutlined,
  MailOutlined,
} from "@ant-design/icons";
import clsx from "clsx";
import { useMemo, useState, type CSSProperties } from "react";
import {
  loginAccount,
  registerAccount,
} from "../lib/openclaw-api";
import type { AuthUser } from "../lib/types";

const { Title, Paragraph } = Typography;

export function LoginPanel({
  apiBaseUrl,
  onAuthed,
}: {
  apiBaseUrl: string;
  onAuthed: (token: string, user: AuthUser) => void;
}) {
  const { message } = AntApp.useApp();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [focusField, setFocusField] = useState<"email" | "password" | "displayName" | "inviteCode" | null>(null);
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.45 });
  const [form] = Form.useForm();
  const passwordValue = Form.useWatch("password", form) || "";
  const inputActive = focusField !== null;
  const passwordLean = Math.min(String(passwordValue).length, 16) / 16;

  const submit = async () => {
    const values = await form.validateFields();
    setLoading(true);
    try {
      if (mode === "login") {
        const session = await loginAccount(apiBaseUrl, {
          email: values.email,
          password: values.password,
        });
        onAuthed(session.token, session.user);
      } else {
        await registerAccount(apiBaseUrl, {
          email: values.email,
          password: values.password,
          displayName: values.displayName,
          inviteCode: values.inviteCode,
        });
        message.success("注册成功，请登录");
        setMode("login");
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : "操作失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen overflow-hidden bg-[#f4efe8] text-slate-950 lg:grid-cols-[1.05fr_0.95fr]">
      <section
        className="relative isolate overflow-hidden bg-[linear-gradient(160deg,#4b5563_0%,#2f3642_40%,#1f2937_100%)]"
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setMouse({
            x: (event.clientX - rect.left) / rect.width,
            y: (event.clientY - rect.top) / rect.height,
          });
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.16),transparent_32%),radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.08),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.08),transparent_30%)]" />
        <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),transparent)]" />
        <div className="relative flex min-h-[44vh] flex-col justify-between px-8 py-8 sm:px-12 sm:py-10 lg:min-h-screen lg:px-14 lg:py-14">
          <div className="max-w-md text-white/90">
            <p className="text-xs font-semibold uppercase tracking-[0.38em] text-white/55">OpenClaw Client</p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">写作助手工作台</h1>
          </div>

          <CharacterStage mouse={mouse} inputActive={inputActive} avertEyes={focusField === "password"} passwordLean={passwordLean} />

          <div className="max-w-xl text-white/72">
            <p className="text-sm leading-7 sm:text-base">代理邀请码注册、多账号管理、AI 写作与草稿箱发送，统一在一个工作台里完成。</p>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center bg-[#f7f3ee] px-6 py-10 sm:px-10 lg:px-14">
        <div className="w-full max-w-md rounded-[36px] border border-white/70 bg-white/90 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur sm:p-10">
          <div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.32em] text-[#6b7280]">Secure Access</span>
              <Title className="!mt-4 !mb-0 !text-4xl !font-semibold !tracking-tight !text-slate-950" level={2}>
                {mode === "login" ? "Welcome back!" : "Create account"}
              </Title>
              <Paragraph className="!mt-2 !mb-0 !text-sm !leading-6 !text-slate-500">
                {mode === "login" ? "登录账号，继续你的内容创作流程。" : "使用代理邀请码注册，开启智能写作工作台。"}
              </Paragraph>
            </div>

            <div className="mt-7 grid grid-cols-2 rounded-full border border-slate-200 bg-stone-50 p-1" role="tablist" aria-label="账号入口">
              <button className={clsx("rounded-full px-4 py-3 text-sm font-semibold transition", mode === "login" ? "bg-slate-950 text-white shadow-sm" : "text-slate-500 hover:text-slate-950")} type="button" onClick={() => setMode("login")}>
                登录账号
              </button>
              <button className={clsx("rounded-full px-4 py-3 text-sm font-semibold transition", mode === "register" ? "bg-slate-950 text-white shadow-sm" : "text-slate-500 hover:text-slate-950")} type="button" onClick={() => setMode("register")}>
                注册账号
              </button>
            </div>
          </div>

          <Form className="mt-8" form={form} layout="vertical" onFinish={submit}>
            {mode === "register" ? (
              <Form.Item className="admin-form-item" name="displayName" label="创作者昵称" rules={[{ required: true, message: "请输入昵称" }]}>
                <Input className="!h-14 !rounded-full !border-slate-200 !bg-white !px-5 !text-sm !text-slate-900 !shadow-none focus:!border-[#5b43ff]" size="large" placeholder="例如：林大大" onFocus={() => setFocusField("displayName")} onBlur={() => setFocusField(null)} />
              </Form.Item>
            ) : null}
            {mode === "register" ? (
              <Form.Item
                className="admin-form-item"
                name="inviteCode"
                label="代理人邀请码（8 位字母）"
                normalize={(value) => String(value || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 8)}
                rules={[{ required: true, message: "请输入邀请码" }]}
              >
                <Input
                  className="!h-14 !rounded-full !border-slate-200 !bg-white !px-5 !text-sm !text-slate-900 !shadow-none focus:!border-[#5b43ff]"
                  size="large"
                  prefix={<GiftOutlined className="text-slate-400" />}
                  placeholder="例如：ABCDEFGH"
                  maxLength={8}
                  onFocus={() => setFocusField("inviteCode")}
                  onBlur={() => setFocusField(null)}
                />
              </Form.Item>
            ) : null}
            <Form.Item className="admin-form-item" name="email" label="邮箱账号" rules={[{ required: true, message: "请输入邮箱" }]}>
              <Input className="!h-14 !rounded-full !border-slate-200 !bg-white !px-5 !text-sm !text-slate-900 !shadow-none focus:!border-[#5b43ff]" size="large" prefix={<MailOutlined className="text-slate-400" />} placeholder="name@example.com" onFocus={() => setFocusField("email")} onBlur={() => setFocusField(null)} />
            </Form.Item>
            <Form.Item className="admin-form-item" name="password" label="密码" rules={[{ required: true, message: "请输入密码" }]}>
              <Input.Password className="!h-14 !rounded-full !border-slate-200 !bg-white !px-5 !text-sm !text-slate-900 !shadow-none focus:!border-[#5b43ff]" size="large" prefix={<LockOutlined className="text-slate-400" />} placeholder="至少 6 位字符" onFocus={() => setFocusField("password")} onBlur={() => setFocusField(null)} />
            </Form.Item>
            <Button className="!mt-2 !h-14 !rounded-full !border-slate-200 !bg-slate-950 !text-sm !font-semibold !text-white hover:!bg-slate-800" type="primary" htmlType="submit" size="large" block loading={loading} icon={<LoginOutlined />}>
              {mode === "login" ? "登录并进入工作台" : "注册账号并继续"}
            </Button>
          </Form>
        </div>
      </section>
    </main>
  );
}

function CharacterStage({
  mouse,
  inputActive,
  avertEyes,
  passwordLean,
}: {
  mouse: { x: number; y: number };
  inputActive: boolean;
  avertEyes: boolean;
  passwordLean: number;
}) {
  return (
    <div className="relative mt-6 h-[410px] w-full max-w-[520px] sm:h-[500px] lg:mt-0 lg:h-[620px] lg:max-w-[640px]">
      <div className="absolute left-1/2 top-[58%] h-[240px] w-[360px] -translate-x-1/2 rounded-full bg-black/15 blur-3xl sm:h-[280px] sm:w-[420px] lg:top-[60%] lg:h-[320px] lg:w-[500px]" />
      <Character color="#ff774d" shape="arch" width={206} height={198} left={44} bottom={72} eyeBase={{ x: 0.52, y: 0.54 }} mouse={mouse} inputActive={inputActive} avertEyes={avertEyes} passwordLean={passwordLean} layer={3} eyeStyle="dot" eyeBias={avertEyes ? "left" : "right"} eyeY="28%" />
      <Character color="#4c24ff" shape="slant" width={150} height={356} left={142} bottom={104} eyeBase={{ x: 0.54, y: 0.23 }} mouse={mouse} inputActive={inputActive} avertEyes={avertEyes} passwordLean={passwordLean} role="leader" layer={1} eyeStyle="full" eyeBias={avertEyes ? "left" : "right"} blink="soft" />
      <Character color="#17171d" shape="slim" width={108} height={286} left={266} bottom={70} eyeBase={{ x: 0.54, y: 0.18 }} mouse={mouse} inputActive={inputActive} avertEyes={avertEyes} passwordLean={passwordLean} layer={2} eyeStyle="full" eyeBias={avertEyes ? "left" : "right"} blink="double" />
      <Character color="#d9c437" shape="arch" width={132} height={252} left={352} bottom={66} eyeBase={{ x: 0.5, y: 0.23 }} mouse={mouse} inputActive={inputActive} avertEyes={avertEyes} passwordLean={passwordLean} mouth layer={4} eyeStyle="dot" eyeBias={avertEyes ? "left" : "right"} />
    </div>
  );
}

function Character({
  color,
  shape,
  width,
  height,
  left,
  bottom,
  eyeBase,
  mouse,
  inputActive,
  avertEyes,
  passwordLean,
  mouth = false,
  role = "default",
  layer = 1,
  eyeStyle = "full",
  eyeBias = "center",
  eyeY = "17%",
  blink = "none",
}: {
  color: string;
  shape: "arch" | "slant" | "slim";
  width: number;
  height: number;
  left: number;
  bottom: number;
  eyeBase: { x: number; y: number };
  mouse: { x: number; y: number };
  inputActive: boolean;
  avertEyes: boolean;
  passwordLean: number;
  mouth?: boolean;
  role?: "default" | "leader";
  layer?: number;
  eyeStyle?: "full" | "dot";
  eyeBias?: "left" | "center" | "right";
  eyeY?: string;
  blink?: "none" | "soft" | "double";
}) {
  const peeking = inputActive && !avertEyes;
  const leanStrength = role === "leader" ? 1 : shape === "arch" ? 0.55 : 0.7;
  const leanRotate = passwordLean * 10 * leanStrength;
  const leanLift = passwordLean * 14 * leanStrength;
  const leanShift = passwordLean * 8 * leanStrength;

  const transform = useMemo(() => {
    if (role === "leader" && peeking) {
      return `translate3d(${22 + leanShift}px, ${-38 - leanLift}px, 0) rotateZ(${7 + leanRotate * 0.45}deg) scale(${1.05 + passwordLean * 0.026})`;
    }

    if (peeking) {
      return `translate3d(${10 + leanShift * 0.55}px, ${-10 - leanLift * 0.62}px, 0) rotateZ(${leanRotate * 0.28}deg)`;
    }

    return "translate3d(0,0,0)";
  }, [leanLift, leanRotate, leanShift, passwordLean, peeking, role]);

  const lookX = (mouse.x - eyeBase.x) * 15;
  const lookY = (mouse.y - eyeBase.y) * 12;
  const mouthStyle: CSSProperties | undefined = mouth
    ? {
        transform: `translate(calc(-50% + ${Math.max(-5.5, Math.min(5.5, lookX * 0.26))}px), ${Math.max(-1.5, Math.min(4, lookY * 0.16 + passwordLean * 2.8))}px) scaleX(${1 - passwordLean * 0.08}) rotate(${Math.max(-4, Math.min(4, lookX * 0.12))}deg)`,
      }
    : undefined;
  const pupilStyle = avertEyes
    ? { transform: "translate3d(-1.6px, -0.1px, 0)", opacity: 1 }
    : {
        transform: `translate3d(${Math.max(-2.1, Math.min(2.1, lookX * 0.5))}px, ${Math.max(-1.5, Math.min(1.5, lookY * 0.42))}px, 0)`,
        opacity: 1,
      };
  const radius = shape === "arch" ? "999px 999px 18px 18px" : shape === "slant" ? "10px 10px 14px 14px" : "10px 10px 0 0";
  const baseTilt = peeking && role === "leader" ? "perspective(900px) rotateX(7deg) rotateY(-2deg)" : "";
  const skew = shape === "slant" ? "skewY(-8deg)" : "none";
  const neck = peeking
    ? role === "leader"
      ? `translate(${8 + leanShift * 0.2}px, ${8 + leanLift * 0.4}px) rotate(${1.5 + leanRotate * 0.08}deg) scaleY(${0.98 - passwordLean * 0.03})`
      : `translateY(${-18 + leanLift * 0.15}px) rotate(${leanRotate * 0.12}deg)`
    : "translateY(0)";

  return (
    <div className="absolute transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)] will-change-transform" style={{ width, height, left, bottom, zIndex: layer, transform, transformStyle: "preserve-3d" }}>
      <div
        className="absolute inset-0 shadow-[0_20px_48px_rgba(0,0,0,0.18)] transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)]"
        style={{
          background: color,
          borderRadius: radius,
          transform: `${baseTilt} ${skew} ${neck}`.trim(),
          transformOrigin: peeking && role === "leader" ? "78% 100%" : "bottom center",
          clipPath: peeking && role === "leader" ? "polygon(8% 0%, 100% 0%, 100% 100%, 86% 100%, 82% 90%, 62% 84%, 24% 82%, 0% 100%, 0% 18%)" : undefined,
        }}
      >
        <div className="absolute inset-0 rounded-[inherit] bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent_45%)]" />
        <Eye x="39%" y={eyeY} pupilStyle={pupilStyle} avertEyes={avertEyes} lookX={lookX} lookY={lookY} eyeStyle={eyeStyle} eyeBias={eyeBias} blink={blink} />
        <Eye x="61%" y={eyeY} pupilStyle={pupilStyle} avertEyes={avertEyes} lookX={lookX} lookY={lookY} eyeStyle={eyeStyle} eyeBias={eyeBias} blink={blink} />
        {mouth ? <div className="absolute left-1/2 top-[44%] h-[3px] w-10 rounded-full bg-slate-900/80 transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)] [animation:openclaw-mouth-bob_2.3s_ease-in-out_infinite]" style={mouthStyle} /> : null}
      </div>
    </div>
  );
}

function Eye({
  x,
  y,
  pupilStyle,
  avertEyes,
  lookX,
  lookY,
  eyeStyle,
  eyeBias,
  blink,
}: {
  x: string;
  y: string;
  pupilStyle: CSSProperties;
  avertEyes: boolean;
  lookX: number;
  lookY: number;
  eyeStyle: "full" | "dot";
  eyeBias: "left" | "center" | "right";
  blink: "none" | "soft" | "double";
}) {
  const biasOffset = eyeBias === "left" ? -5.8 : eyeBias === "right" ? 5.8 : 0;
  const trackingOffsetX = eyeStyle === "dot" ? Math.max(-5.4, Math.min(5.4, lookX * 0.4)) : Math.max(-2.2, Math.min(2.2, lookX * 0.16));
  const trackingOffsetY = eyeStyle === "dot" ? Math.max(-3.6, Math.min(3.6, lookY * 0.3)) : Math.max(-1.5, Math.min(1.5, lookY * 0.12));
  const eyeOffsetX = biasOffset + trackingOffsetX;
  const eyeOffsetY = trackingOffsetY;
  const shellRotate = eyeStyle === "full" ? (eyeBias === "left" ? -10 : eyeBias === "right" ? 10 : 0) : 0;
  const shellScaleX = eyeStyle === "full" && eyeBias !== "center" ? 0.86 : 1;
  const blinkAnimation: CSSProperties | undefined =
    eyeStyle === "full" && blink !== "none"
      ? {
          animation: blink === "soft" ? "openclaw-blink-soft 4.8s ease-in-out infinite 0.35s" : "openclaw-blink-double 3.35s ease-in-out infinite 1.05s",
          transformOrigin: "center 58%",
        }
      : undefined;

  if (eyeStyle === "dot") {
    return <div className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-950 transition-all duration-500 ease-[cubic-bezier(.22,1,.36,1)]" style={{ left: x, top: y, transform: `translate(calc(-50% + ${eyeOffsetX}px), calc(-50% + ${eyeOffsetY}px))` }} />;
  }

  return (
    <div
      className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#fff9f3] shadow-[0_2px_8px_rgba(15,23,42,0.14)] transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)]"
      style={{
        left: x,
        top: y,
        transform: `translate(calc(-50% + ${eyeOffsetX}px), calc(-50% + ${eyeOffsetY}px)) rotate(${shellRotate}deg) scaleX(${shellScaleX})`,
        ...blinkAnimation,
      }}
    >
      <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-950 transition-all duration-500 ease-[cubic-bezier(.22,1,.36,1)]" style={pupilStyle} />
      {avertEyes ? <div className="absolute left-1/2 top-1/2 h-[1.5px] w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-950/22" /> : null}
    </div>
  );
}
