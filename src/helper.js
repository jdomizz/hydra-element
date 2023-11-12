export function parseNumber(value, defaultValue, min, max) {
  const parsedValue = parseInt(value, 10)
  return isNaN(parsedValue, min, max) 
    ? defaultValue
    : parsedValue
}
  
export function parseJSON(value, defaultValue) {
  return value
    ? JSON.parse(value)
    : defaultValue
}
  
export function parseOption(value, defaultValue, options) {
  return options.includes(value)
    ? value
    : defaultValue
}
  
function isNaN(value, min, max) {
  return max 
    ? Number.isNaN(value) 
      || value < min 
      || value > max
    : Number.isNaN(value) 
      || value < min 
}
  