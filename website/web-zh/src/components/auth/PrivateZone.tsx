interface Props {
  children: React.ReactNode;
  label?: string;
}

/** 本地单用户模式：始终直接渲染内容，无登录墙 */
export function PrivateZone({ children }: Props) {
  return <>{children}</>;
}
