export const parseExpiration = (exp: string) => {
  const time = parseInt(exp.slice(0, -1));
  const unit = exp.slice(-1);
  switch (unit) {
    case 'm':
      return time * 60 * 1000;
    case 'h':
      return time * 60 * 60 * 1000;
    case 'd':
      return time * 24 * 60 * 60 * 1000;
    default:
      return 0;
  }
};
