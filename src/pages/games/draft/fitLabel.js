export function fitLabel(fit) {
  if (fit >= 80) return 'Excellent'
  if (fit >= 65) return 'Strong'
  if (fit >= 50) return 'Solid'
  if (fit >= 35) return 'Weak'
  return 'Poor'
}
