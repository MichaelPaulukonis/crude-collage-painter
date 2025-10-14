// 1D contant vector
const vector = ({
  value,
  min = 2,
  max = 20,
  direction = 1,
  speed = 0.5
}) => {
  const self = { value, direction, speed, min, max }
  self.next = () => {
    let newValue = self.value + (self.speed * self.direction)
    self.direction = (newValue <= self.min || newValue >= self.max) ? -self.direction : self.direction
    newValue = Math.max(Math.min(newValue, self.max), self.min)
    self.value = newValue
    return self
  }
  self.set = vec => {
    self.min = vec.min
    self.max = vec.max
    self.diretion = vec.direction
    self.speed = vec.speed
    self.value = vec.value
  }
  return self
}

module.exports = { vector }