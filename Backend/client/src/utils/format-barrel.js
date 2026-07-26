export * from './format';
export { PageHead, Btn, Field, RoleBadge, useToast, Reveal } from '../components/ui';
export const initials = n => (n || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();