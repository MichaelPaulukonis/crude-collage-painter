import '../css/style.css'
import { sketch, p5 } from 'p5js-wrapper'
import saveAs from 'file-saver'
import { datestring, filenamer } from './filelib'
import './utils.js'

let namer = filenamer(datestring())
var utils

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
let scale = { width: 0, height: 0 } // for selection windowing
let offset = { x: 0, y: 0 } // for selection windowing
let zoom = 1.5
let painted
let cnvs
let selectedFragment
let sourceImage
let sourceIndex = 0
let density
const activityModes = {
  Selecting: 'select',
  Drawing: 'draw',
  Gallery: 'gallery'
}
let activity = activityModes.Selecting
let isDrawing = false

sketch.preload = () => {
  for (let i = 0; i < 3; i++) {
    let fname = `images/image.${i.toString().padStart(2, '0')}.jpg`
    elementImages[i] = loadImage(fname)
  }
}

sketch.setup = () => {
  utils = new p5.Utils()
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
      activity = activityModes.Gallery
      displayGallery()
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
  // utils.debug({ 'target': `${target.x} ${target.y}` })
  switch (activity) {
    case activityModes.Drawing:
      render()
      // source to destination
      // copy a _SMALLER_ area, but stil target "normal" 50px
      let dOffset = isDrawing 
        ? {x: mouseX - target.x, y: mouseY - target.y}
        : {x: 0, y: 0}
      copy(
        sourceFrom.img,
        (sourceFrom.x * zoom + dOffset.x) / zoom,
        (sourceFrom.y * zoom + dOffset.y) / zoom,
        Math.round(50 / zoom),
        Math.round(50 / zoom),
        mouseX,
        mouseY,
        50,
        50
      )
      if (mouseIsPressed) captureDrawing()
      // https://stackoverflow.com/questions/69171227/p5-image-from-get-is-drawn-blurry-due-to-pixeldensity-issue-p5js
      break

    case activityModes.Selecting:
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
      background('white')
      image(
        sourceImage,
        0 - offset.x,
        0 - offset.y,
        sourceImage.width,
        sourceImage.height
      )
      break
  }
}

const saver = (canvas, name) => {
  canvas.toBlob(blob => saveAs(blob, name))
}

function download () {
  const name = namer() + '.png'
  saver(cnvs.drawingContext.canvas, name)
  console.log('downloaded ' + name)
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

// this is START of press
sketch.mousePressed = () => {
  if (activity === activityModes.Drawing) {
    isDrawing = true
    // capture initial location
    target = {
      x: mouseX,
      y: mouseY
    }
  }
}

sketch.mouseReleased = () => {
  if (activity === activityModes.Drawing) {
    isDrawing = false
  }

  if (activity === activityModes.Selecting) {
    renderSource()

    sourceFrom = {
      x: Math.round(mouseX + offset.x),
      y: Math.round(mouseY + offset.y),
      img: sourceImage
    }

    console.log(mouseX, offset.x, mouseY, offset.y, zoom, sourceFrom)

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

// Show input image gallery (no more than 9 for speed)
const displayGallery = () => {
  const tileCountX = 3
  const tileCountY = 3

  const tileWidth = cnvs.width / tileCountX
  const tileHeight = cnvs.height / tileCountY
  background('white')
  fill('black')

  let i = 0
  for (let gridY = 0; gridY < tileCountY; gridY++) {
    for (let gridX = 0; gridX < tileCountX; gridX++) {
      if (i >= elementImages.length) {
        text(
          'Drop to upload',
          gridX * tileWidth + 20,
          gridY * tileHeight + tileWidth / 2
        )
      } else {
        const tmp = elementImages[i].get()
        tmp.resize(0, tileHeight)
        image(tmp, gridX * tileWidth, gridY * tileHeight)
      }
      i++
    }
  }
}

sketch.keyPressed = () => {
  // possible only during selection activity
  // maybe we need multiple scenes for this? !!! ?
  if (keyCode === UP_ARROW) {
    zoom += 0.1
  } else if (keyCode === DOWN_ARROW) {
    zoom = +(zoom - 0.1 <= 0.1 ? 0.1 : zoom - 0.1).toFixed(2)
  }

  if (key === 'p') {
    renderSource()
    activity = activityModes.Selecting
    stroke('black')
    strokeWeight(2)
  } else if (key === 's') {
    download()
  } else if (key === 'd') {
    activity = activityModes.Drawing
  } else if (key === 'i') {
    sourceIndex = ++sourceIndex % elementImages.length
    sourceImage = elementImages[sourceIndex]
    renderSource()
  } else if (key === 'g') {
    activity = activityModes.Gallery
    displayGallery()
  }

  return false // Prevent default behavior
}
