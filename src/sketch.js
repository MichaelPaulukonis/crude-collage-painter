import '../css/style.css'
import { sketch, p5 } from 'p5js-wrapper'
import { Pane } from 'tweakpane'
import saveAs from 'file-saver'
import { datestring, filenamer } from './filelib'
import './utils.js'

let namer = filenamer(datestring())
var utils
const pane = new Pane()

let elementImages = []

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
let selectionCursor = {
  width: 50,
  height: 50,
  shape: 'square' // for the future
}
const activityModes = {
  Selecting: 'select',
  Drawing: 'draw',
  Gallery: 'gallery'
}
let isDrawing = false
const copyModes = {
  Relative: 'relative',
  Absolute: 'absolute',
  RubberStamp: 'rubberstamp',
  BadScale: 'badscale'
}

let config = {
  activity: activityModes.Selecting,
  copyMode: copyModes.Relative,
  minDistance: 30,
  rotateSource: false,
  rotateSpeed: 50,
  gapCounter: 0,
  gapLength: 5,
  gapActive: false,
  gapChance: 0.05,
  zoom: 1.0
}

let scale = { width: 0, height: 0 } // for selection windowing
let offset = { x: 0, y: 0 } // for selection windowing
let painted
let cnvs
let sourceImage
let sourceIndex = 0
let density
let prevMouse

sketch.preload = () => {
  for (let i = 0; i < 3; i++) {
    let fname = `./images/image.${i.toString().padStart(2, '0')}.jpg`
    elementImages[i] = loadImage(fname)
  }
}

sketch.setup = () => {
  utils = new p5.Utils()
  const mc = document.getElementById('main-canvas')
  cnvs = createCanvas(600, 600, mc)
  cnvs.drop(handleFile)
  density = pixelDensity()
  painted = createImage(width * density, height * density)
  sourceImage = elementImages[sourceIndex]
  background(255)
  captureDrawing()
  rectMode(CENTER)
  noFill()
  prevMouse = createVector(0, 0)

  const tab = pane.addTab({
    pages: [{ title: 'Parameters' }]
  })
  const parmTab = tab.pages[0]

  parmTab.addBinding(config, 'copyMode', { options: copyModes })
  parmTab.addBinding(config, 'zoom', { min: 0.01, max: 10, step: 0.01 })

  parmTab.addBinding(config, 'minDistance', { min: 1, max: 200, step: 1 })
  parmTab.addBinding(config, 'rotateSource')
  parmTab.addBinding(config, 'rotateSpeed', { min: 0, max: 50, step: 1 })
  parmTab.addBinding(config, 'gapLength', { min: 5, max: 50, step: 1 })
  parmTab.addBinding(config, 'gapChance', { min: 0, max: 1, step: 0.01 })

  parmTab.addBinding(config, 'gapActive')

  parmTab
    .addButton({
      title: 'Add to Gallery'
      // hidden: config.activity !== activityModes.Drawing // meh, not reactive
    })
    .on('click', () => addToGallery())
}

// Handle file uploads
function handleFile (file) {
  if (file.type === 'image') {
    loadImage(file.data, img => {
      elementImages.push(img)
      scale = getScale(img, cnvs)
      // if we're drawing, paint it
      if (config.activity === activityModes.Drawing) {
        image(img, 0, 0)
        captureDrawing()
      } else {
        config.activity = activityModes.Gallery
        displayGallery()
      }
    })
  } else {
    console.log('Not an image file!')
  }
}

const addToGallery = () => {
  let img = createImage(width, height)
  img.copy(cnvs, 0, 0, width, height, 0, 0, width, height)
  elementImages.push(img)
}

// boundry is the visible window to fill {width, height}
const getScale = (img, boundary) => {
  const widthRatio = boundary.width / img.width
  const heightRatio = boundary.height / img.width
  const ratio = Math.max(widthRatio, heightRatio)

  return { x: img.width * ratio, y: Math.floor(img.height * ratio), ratio }
}

// when I click, that becomes the "zero-point" that matches selection-point
sketch.draw = () => {
  pane.refresh()
  switch (config.activity) {
    case activityModes.Drawing:
      noCursor()
      handleKeyInput()
      render()

      if (
        config.rotateSource &&
        config.rotateSpeed !== 0 &&
        frameCount % (101 - config.rotateSpeed * 2) === 0
      ) {
        rotateImageIndex()
        setSource()
      }

      let dOffset

      if (isDrawing) {
        switch (config.copyMode) {
          case copyModes.RubberStamp:
            dOffset = { x: 0, y: 0 }
            break
          case copyModes.Relative:
          case copyModes.BadScale:
            dOffset = { x: mouseX - target.x, y: mouseY - target.y }
            break
          case copyModes.Absolute:
            // we have to capture/match the offset from selecting mode
            dOffset = { x: mouseX, y: mouseY }
        }
      } else {
        switch (config.copyMode) {
          case copyModes.RubberStamp:
          case copyModes.Relative:
          case copyModes.BadScale:
            dOffset = { x: 0, y: 0 }
            break
          case copyModes.Absolute:
            dOffset = { x: mouseX, y: mouseY }
        }
      }

      if (config.copyMode === copyModes.BadScale) {
        copy(
          sourceFrom.img,
          Math.floor(sourceFrom.x + dOffset.x - selectionCursor.width / 2),
          Math.floor(sourceFrom.y + dOffset.y - selectionCursor.height / 2),
          Math.floor(selectionCursor.width / config.zoom),
          Math.floor(selectionCursor.height / config.zoom),
          Math.floor(mouseX - selectionCursor.width / 2),
          Math.floor(mouseY - selectionCursor.height / 2),
          selectionCursor.width,
          selectionCursor.height
        )
      } else {
        copy(
          sourceFrom.img,
          Math.floor(
            (sourceFrom.x * config.zoom + dOffset.x - selectionCursor.width / 2) /
              config.zoom
          ),
          Math.floor(
            (sourceFrom.y * config.zoom + dOffset.y - selectionCursor.height / 2) /
              config.zoom
          ),
          Math.floor(selectionCursor.width / config.zoom),
          Math.floor(selectionCursor.height / config.zoom),
          Math.floor(mouseX - selectionCursor.width / 2),
          Math.floor(mouseY - selectionCursor.height / 2),
          selectionCursor.width,
          selectionCursor.height
        )
      }

      if (mouseIsPressed) {
        if (prevMouse.x === 0 && prevMouse.y === 0) {
          prevMouse = createVector(mouseX, mouseY)
        }
        let curMouse = createVector(mouseX, mouseY)
        const distance = Math.floor(curMouse.dist(prevMouse))
        if (!config.gapActive && random(1) < config.gapChance) {
          config.gapActive = true
          config.gapCounter = 0
        }
        if (config.gapActive) {
          config.gapCounter++
        }
        if (
          distance >= config.minDistance &&
          (!config.gapActive || config.gapCounter >= config.gapLength)
        ) {
          prevMouse = curMouse.copy()
          captureDrawing()
          config.gapCounter = 0
          config.gapActive = false
        }
      }

      // https://stackoverflow.com/questions/69171227/p5-image-from-get-is-drawn-blurry-due-to-pixeldensity-issue-p5js
      break

    case activityModes.Selecting:
      cursor('crosshair');
      noFill()
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
      rect(
        mouseX,
        mouseY,
        selectionCursor.width / config.zoom,
        selectionCursor.height / config.zoom
      )
      break

    default:
      cursor('crosshair')
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
  if (config.activity === activityModes.Drawing) {
    isDrawing = true
    // capture initial location
    if (
      config.copyMode === copyModes.Relative ||
      config.copyMode === copyModes.BadScale ||
      config.copyMode === copyModes.Absolute
    ) {
      target = {
        x: mouseX,
        y: mouseY
      }
    }
  } else if (config.activity === activityModes.Gallery) {
    const tileSize = cnvs.width / 3
    let clickedIndex = floor(mouseX / tileSize) + floor(mouseY / tileSize) * 3
    if (clickedIndex < elementImages.length) {
      sourceIndex = clickedIndex
      sourceImage = elementImages[sourceIndex]
      sourceFrom = {
        x: sourceImage.width / 2,
        y: sourceImage.height / 2, // or... keep what is set, as long as w/in new boundaries
        img: sourceImage
      }
    }
    displayGallery()
  }
}

sketch.mouseReleased = () => {
  if (config.activity === activityModes.Drawing) {
    isDrawing = false
  }

  if (config.activity === activityModes.Selecting) {
    renderSource()

    sourceFrom = {
      x: Math.floor(mouseX + offset.x),
      y: Math.floor(mouseY + offset.y),
      img: sourceImage
    }
  }
}

const paintGrid = () => {
  const w = Math.ceil(cnvs.width / selectionCursor.width)
  const h = Math.ceil(cnvs.height / selectionCursor.height)

  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      const xPos = x * selectionCursor.width
      const yPos = y * selectionCursor.height
      copy(
        sourceFrom.img,
        Math.floor(
          (sourceFrom.x * config.zoom - selectionCursor.width / 2) / config.zoom
        ),
        Math.floor(
          (sourceFrom.y * config.zoom - selectionCursor.height / 2) / config.zoom
        ),
        Math.floor(selectionCursor.width / config.zoom),
        Math.floor(selectionCursor.height / config.zoom),
        xPos,
        yPos,
        selectionCursor.width,
        selectionCursor.height
      )
    }
  }
}

// Show input image gallery (no more than 9 for speed)
const displayGallery = () => {
  cursor('crosshair')
  const tileCountX = 3
  const tileCountY = 3

  const tileWidth = cnvs.width / tileCountX
  const tileHeight = cnvs.height / tileCountY
  background('white')
  fill('black')
  noStroke()

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

        if (sourceIndex === i) {
          noFill()
          stroke('green')
          strokeWeight(4)
          rect(
            gridX * tileWidth + tileWidth / 2,
            gridY * tileHeight + tileWidth / 2,
            tileWidth,
            tileWidth
          )
          fill('black')
          noStroke()
        }
      }
      i++
    }
  }
}

const deleteImage = index => {
  elementImages.splice(index, 1)
  sourceIndex =
    sourceIndex < elementImages.length ? sourceIndex : sourceIndex - 1
  sourceImage = elementImages[sourceIndex]
}

const handleKeyInput = () => {
  let multiplier = 1
  let moveSource = false
  if (keyIsDown(SHIFT)) multiplier = 10
  if (keyIsDown(ALT)) moveSource = true

  if (moveSource) {
  // TODO: need rail-guards
  if (keyIsDown(RIGHT_ARROW)) {
    sourceFrom.x += 1 * multiplier / 5
  } else if (keyIsDown(LEFT_ARROW)) {
    sourceFrom.x -= 1 * multiplier / 5
  } else if (keyIsDown(UP_ARROW)) {
    sourceFrom.y += 1 * multiplier / 5
  } else if (keyIsDown(DOWN_ARROW)) {
    sourceFrom.y -= 1 * multiplier / 5
  }
  sourceFrom.x = constrain(sourceFrom.x, 0, sourceImage.width)
  sourceFrom.y = constrain(sourceFrom.y, 0, sourceImage.height)
  } else {
    if (keyIsDown(RIGHT_ARROW)) {
      selectionCursor.width += 1 * multiplier
      selectionCursor.height += 1 * multiplier
    } else if (keyIsDown(LEFT_ARROW)) {
      selectionCursor.width -= 1 * multiplier
      selectionCursor.height -= 1 * multiplier
    } else if (keyIsDown(UP_ARROW)) {
      config.zoom += 0.01
    } else if (keyIsDown(DOWN_ARROW)) {
      config.zoom = +(
        config.zoom - 0.01 <= 0.01 ? 0.01 : config.zoom - 0.01
      ).toFixed(2)
    }
  }
}

const rotateImageIndex = () => {
  sourceIndex = ++sourceIndex % elementImages.length
  sourceImage = elementImages[sourceIndex]
}

const setSource = () => {
  sourceFrom = {
    x: sourceImage.width / 2,
    y: sourceImage.height / 2, // or... keep what is set, as long as w/in new boundaries
    img: sourceImage
  }
}

const clearCanvas = () => {
  background('white')
  captureDrawing()
}

sketch.keyPressed = () => {
  // mode invariant
  if (key === 'p') {
    renderSource()
    config.activity = activityModes.Selecting
    stroke('black')
    strokeWeight(2)
  } else if (key === 'g') {
    config.activity = activityModes.Gallery
    displayGallery()
  } else if (key === 'd') {
    config.activity = activityModes.Drawing
  } else if (key === 'i') {
    rotateImageIndex()
    renderSource() // why???
    setSource()
  } else if (config.activity === activityModes.Drawing) {
    if (key === 'c') {
      clearCanvas()
    } else if (key === 's') {
      download()
    } else if (key === 'm') {
      paintGrid()
      captureDrawing()
    } else if (key === '1') {
      config.copyMode = copyModes.Relative
    } else if (key === '2') {
      config.copyMode = copyModes.RubberStamp
    } else if (key === '3') {
      config.copyMode = copyModes.Absolute
    }
  } else if (config.activity === activityModes.Gallery) {
    if (key === 'i') {
      rotateImageIndex()
      renderSource() // why???
      displayGallery()
    } else if (key === 'x') {
      deleteImage(sourceIndex)
      displayGallery()
    }
  }

  // return false // Prevent default behavior
}
