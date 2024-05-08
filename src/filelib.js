const datestring = () => {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  const secs = String(d.getSeconds()).padStart(2, '0')
  return `${year}${month}${day}${hour}${min}${secs}`
}

const filenamer = (prefix) => {
  let frame = 0
  return () => {
    const name = `collage.${prefix}-${String(frame).padStart(6, '0')}`
    frame += 1
    return name
  }
}

export {
  datestring,
  filenamer
}
