import '../css/style.css'
import { sketch } from 'p5js-wrapper'

let elementImages = []
let selectionRect = {
  x: 0,
  y: 0,
  x2: 0,
  y2: 0
}
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
  density = pixelDensity()
  console.log(`density: ${density}`)
  painted = createImage(width * density, height * density)
  sourceImage = elementImages[sourceIndex]
  image(sourceImage, 0, 0)
  captureDrawing()
  rectMode(CORNERS)
  noFill()
}

sketch.draw = () => {
  if (mouseIsPressed) {
    switch (activity) {
      case activityModes.Selecting:
        selectionRect.x2 = mouseX
        selectionRect.y2 = mouseY
        renderSource()
        rect(
          selectionRect.x,
          selectionRect.y,
          selectionRect.x2,
          selectionRect.y2
        )
        break

      case activityModes.Drawing:
        image(selectedFragment, mouseX, mouseY)
        captureDrawing()
        // https://stackoverflow.com/questions/69171227/p5-image-from-get-is-drawn-blurry-due-to-pixeldensity-issue-p5js
        break
    }
  } else if (activity === activityModes.Drawing) {
    render()
    image(selectedFragment, mouseX, mouseY)
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
  if (activity === activityModes.Selecting) {
    selectionRect.x = mouseX
    selectionRect.y = mouseY
  }
}

sketch.mouseReleased = () => {
  if (activity === activityModes.Selecting) {
    renderSource()

    const sfw = selectionRect.x2 - selectionRect.x
    const sfh = selectionRect.y2 - selectionRect.y

    selectedFragment = createImage(sfw, sfh)
    selectedFragment.copy(
      sourceImage,
      selectionRect.x,
      selectionRect.y,
      sfw,
      sfh,
      0,
      0,
      sfw,
      sfh
    )

    selectionRect = {
      x: 0,
      y: 0,
      x2: 0,
      y2: 0
    }
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
