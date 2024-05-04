import '../css/style.css'
import { sketch } from 'p5js-wrapper'

let elementImages = []
let selectionRect = {
  x: 0,
  y: 0,
  x2: 0,
  y2: 0
}
// origin coords plus source image
// so we could have multiples maybe
let sourceFrom = {
  x: 0,
  y: 0,
  img: null
}
let target = {
  x: 0,
  y: 0
}
let scale = { width: 0, height: 0 }
let offset = { x: 0, y: 0 }
let painted
let cnvs
let selectedFragment
let sourceImage
let sourceIndex = 0
let density
const activityModes = {
  Selecting: 'select',
  Drawing: 'draw'
}
let activity = activityModes.Selecting

sketch.preload = () => {
  for (let i = 0; i < 3; i++) {
    let fname = `images/image.${i.toString().padStart(2, '0')}.jpg`
    elementImages[i] = loadImage(fname)
  }
}

sketch.setup = () => {
  cnvs = createCanvas(600, 600)
  cnvs.drop(handleFile)
  density = pixelDensity()
  console.log(`density: ${density}`)
  painted = createImage(width * density, height * density)
  sourceImage = elementImages[sourceIndex]
  image(sourceImage, 0, 0)
  captureDrawing()
  rectMode(CORNERS)
  noFill()
}

// Handle file uploads
function handleFile (file) {
  if (file.type === 'image') {
    loadImage(file.data, img => {
      elementImages.push(img)
      scale = getScale(img, cnvs)
    })
  } else {
    console.log('Not an image file!')
  }
}

// boundry is the visible window to fill {width, height}
const getScale = (img, boundary) => {
  const widthRatio = boundary.width / img.width
  const heightRatio = boundary.height / img.width
  const ratio = Math.max(widthRatio, heightRatio)

  return { x: img.width * ratio, y: Math.round(img.height * ratio), ratio }
}

// when I click, that becomes the "zero-point" that matches selection-point
sketch.draw = () => {
  if (mouseIsPressed) {
    switch (activity) {
      case activityModes.Drawing:
        copy(
          sourceFrom.img,
          sourceFrom.x + mouseX - target.x,
          sourceFrom.y + mouseY - target.y,
          50,
          50,
          mouseX,
          mouseY,
          50,
          50
        )
        captureDrawing()
        // https://stackoverflow.com/questions/69171227/p5-image-from-get-is-drawn-blurry-due-to-pixeldensity-issue-p5js
        break
    }
  } else if (activity === activityModes.Drawing) {
    render()
    // image(selectedFragment, mouseX, mouseY)
  } else if (activity === activityModes.Selecting) {
    offset.x = constrain(
      map(mouseX, 0, cnvs.width, 0, sourceImage.width - cnvs.width),
      0,
      sourceImage.width - cnvs.width
    )
    offset.y = constrain(
      map(mouseY, 0, cnvs.height, 0, sourceImage.height - cnvs.height),
      0,
      sourceImage.height - cnvs.height
    )
    image(sourceImage, 0 - offset.x, 0 - offset.y)
  }
}

const captureDrawing = () => {
  painted.copy(
    cnvs,
    0,
    0,
    width,
    height,
    0,
    0,
    width * density,
    height * density
  )
}

const render = () => {
  image(painted, 0, 0, width, height)
}

const renderSource = () => {
  image(sourceImage, 0, 0)
}

sketch.mousePressed = () => {
  if (activity === activityModes.Drawing) {
    target.x = mouseX
    target.y = mouseY
  }
}

sketch.mouseReleased = () => {
  if (activity === activityModes.Selecting) {
    renderSource()

    sourceFrom = {
      x: mouseX + offset.x,
      y: mouseY + offset.y,
      img: sourceImage
    }

    // NOTE: Anthony liked this method of painting
    // so, leave it as an option
    // maybe with a grid, or a minimum offset (via distance)
    // const sfw = selectionRect.x2 - selectionRect.x
    // const sfh = selectionRect.y2 - selectionRect.y

    // selectedFragment = createImage(sfw, sfh)
    // selectedFragment.copy(
    //   sourceImage,
    //   selectionRect.x,
    //   selectionRect.y,
    //   sfw,
    //   sfh,
    //   0,
    //   0,
    //   sfw,
    //   sfh
    // )

    // selectionRect = {
    //   x: 0,
    //   y: 0,
    //   x2: 0,
    //   y2: 0
    // }
  }
}

sketch.keyTyped = () => {
  if (key === 's') {
    renderSource()
    activity = activityModes.Selecting
    stroke('black')
    strokeWeight(2)
  } else if (key === 'd') {
    activity = activityModes.Drawing
  } else if (key === 'i') {
    sourceIndex = ++sourceIndex % elementImages.length
    sourceImage = elementImages[sourceIndex]
    renderSource()
  }

  return false
}
