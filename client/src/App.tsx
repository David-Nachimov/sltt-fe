import './App.css'
import React, { useState, useEffect } from 'react'
import * as tf from '@tensorflow/tfjs'
import * as mpHands from '@mediapipe/hands'
import * as drawingUtils from '@mediapipe/drawing_utils'
import * as controls from '@mediapipe/control_utils'
const logo = require('./icons/logo.jpg')

const PORT = 3006
const MODEL_NAME = 'saved_model_new_85'

const DEFAULT_PREDICTION = { class: -1, probability: 1 }

const MAP = {
  '-1': 'Cant translate try something else',
  0: '0',
  1: '1',
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: 'A',
  11: 'B',
  12: 'C',
  13: 'D',
  14: 'E',
  15: 'F',
  16: 'G',
  17: 'H',
  18: 'I',
  19: 'J',
  20: 'K',
  21: 'L',
  22: 'M',
  23: 'N',
  24: 'O',
  25: 'P',
  26: 'Q',
  27: 'R',
  28: 'S',
  29: 'T',
  30: 'U',
  31: 'V',
  32: 'W',
  33: 'X',
  34: 'Y',
  35: 'Z',
}

const App = () => {
  const [isHomePage, setIsHomePage] = useState(false)
  const [prediction, setPrediction] = useState(DEFAULT_PREDICTION)

  const runApp = async () => {
    const net = await tf.loadLayersModel(`http://localhost:${PORT}/${MODEL_NAME}/model.json`)
    detectHands(net)
  }

  const detectHands = (net: tf.LayersModel) => {
    // Our input frames will come from here.
    const videoElement = document.getElementsByClassName('input_video')[0] as HTMLVideoElement
    const canvasElement = document.getElementsByClassName('output_canvas')[0] as HTMLCanvasElement
    const controlsElement = document.getElementsByClassName('control-panel')[0] as HTMLDivElement
    const canvasCtx = canvasElement.getContext('2d')!

    const config = {
      locateFile: (file: string) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@${mpHands.VERSION}/${file}`
      },
    }

    // We'll add this to our control panel later, but we'll save it here so we can
    // call tick() each time the graph runs.
    const fpsControl = new controls.FPS()

    const onResults = (results: mpHands.Results): void => {
      // Update the frame rate.
      fpsControl.tick()

      // Draw the overlays.
      canvasCtx.save()
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height)
      canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height)
      if (results.multiHandLandmarks && results.multiHandedness) {
        for (let index = 0; index < results.multiHandLandmarks.length; index++) {
          const classification = results.multiHandedness[index]
          const isRightHand = classification.label === 'Right'
          const landmarks = results.multiHandLandmarks[index]
          drawingUtils.drawConnectors(canvasCtx, landmarks, mpHands.HAND_CONNECTIONS, {
            color: isRightHand ? '#00FF00' : '#FF0000',
          })
          drawingUtils.drawLandmarks(canvasCtx, landmarks, {
            color: isRightHand ? '#00FF00' : '#FF0000',
            fillColor: isRightHand ? '#FF0000' : '#00FF00',
            radius: (data: drawingUtils.Data) => {
              return drawingUtils.lerp(data.from!.z!, -0.15, 0.1, 10, 1)
            },
          })
        }
      }

      canvasCtx.restore()

      if (results.multiHandWorldLandmarks) {
        // We only get to call updateLandmarks once, so we need to cook the data to
        // fit. The landmarks just merge, but the connections need to be offset.
        const landmarks = results.multiHandWorldLandmarks
          .reduce((prev, current) => [...prev, ...current], [])
          .flatMap((landmark) => [landmark.x, landmark.y])

        const colors = []
        let connections: mpHands.LandmarkConnectionArray = []
        for (let loop = 0; loop < results.multiHandWorldLandmarks.length; ++loop) {
          const offset = loop * mpHands.HAND_CONNECTIONS.length
          const offsetConnections = mpHands.HAND_CONNECTIONS.map((connection) => [
            connection[0] + offset,
            connection[1] + offset,
          ]) as mpHands.LandmarkConnectionArray
          connections = connections.concat(offsetConnections)
          const classification = results.multiHandedness[loop]
          colors.push({
            list: offsetConnections.map((unused, i) => i + offset),
            color: classification.label,
          })
        }

        // console.log(landmarks.length)

        if (landmarks.length === 42) {
          // predict hand signature
          const landmarksTensor = tf.tensor(landmarks).expandDims()
          const arr = net.predict(landmarksTensor) as tf.Tensor
          const pred = arr.dataSync() as Float32Array
          const prediction = getMaxPrediction(pred)
          const THRESHOLD = 0.9
          if (prediction.probability > THRESHOLD) {
            console.log('-----------------------')
            console.log(MAP[prediction.class])
            console.log({ prediction })
            console.log('-----------------------')
            setPrediction(prediction)
          }
        }
      }
    }

    const hands = new mpHands.Hands(config)
    hands.onResults(onResults)

    // Present a control panel through which the user can manipulate the solution
    // options.
    new controls.ControlPanel(controlsElement, {
      selfieMode: true,
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    })
      .add([
        fpsControl,
        new controls.SourcePicker({
          onFrame: async (input: controls.InputImage) => {
            await hands.send({ image: input })
          },
        }),
      ])
      .on((newOptions) => {
        const options = newOptions as mpHands.Options
        videoElement.classList.toggle('selfie', options.selfieMode)
        hands.setOptions(options)
      })
  }

  const getMaxPrediction = (preds: Float32Array): { class: number; probability: number } => {
    const indexOfMaxValue = preds.reduce((iMax, x, i, arr) => (x > arr[iMax] ? i : iMax), 0)
    const probability = preds[indexOfMaxValue]

    return { class: indexOfMaxValue, probability }
  }

  useEffect(() => {
    runApp()
  })

  if (isHomePage) {
    return (
      <div className="video-container">
        <div className="video-header">
          <img src={logo} alt="logo" className="video-logo" />
          <div className="video-titles">
            <div className="main-title">SLTT</div>
            <div className="sub-title">You do the sign, we do the text</div>
          </div>
        </div>
        {prediction.class !== -1 ? (
          <div className="player-translation">
            We think we said: {MAP[prediction.class]} with {(prediction.probability * 100).toFixed(2)}%
          </div>
        ) : (
          <div className="player-translation">
            {MAP[prediction.class]}
          </div>
        )}
        <div className="player-wraper">
          <div className="container">
            <video className="input_video"></video>
            <canvas className="output_canvas" width="640px" height="480px"></canvas>
          </div>
          <div className="control-panel"></div>
          <img className="legand" src="/alphabets-and-numbers-legand.png" alt="LEGAND" />
        </div>
      </div>
    )
  }

  return (
    <div className="main-container">
      <div>
        <div className="main-title">Welcome to SLTT</div>
        <div className="second-title">You do the sign, we do the text</div>
      </div>
      <img src={logo} alt="logo" className="logo-center" />
      <div>
        <button className="press-btn" onClick={() => setIsHomePage(true)}>
          Press Start
        </button>
      </div>
    </div>
  )
}

export default App
