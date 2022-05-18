import './App.css'
import React, { useState, useEffect } from 'react'
import * as tf from '@tensorflow/tfjs'
import * as mpHands from '@mediapipe/hands'
import * as drawingUtils from '@mediapipe/drawing_utils'
import * as controls from '@mediapipe/control_utils'
const logo = require('./icons/logo.jpg')

const App = () => {
  const [isHomePage, setIsHomePage] = useState(false)
  const [prediction, setPrediction] = useState({ class: -1, probability: 0 })

  const runApp = async () => {
    const net = await tf.loadLayersModel('http://localhost:3006/saved_model_new_3d/model.json')
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
          .flatMap((landmark) => [landmark.x, landmark.y, landmark.z])

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

        if (landmarks.length === 63) {
          // predict hand signature
          const landmarksTensor = tf.tensor(landmarks).expandDims()
          const arr = net.predict(landmarksTensor) as tf.Tensor
          const pred = arr.dataSync() as Float32Array
          const prediction = getMaxPrediction(pred)
          const THRESHOLD = 0.9
          if (prediction.probability > THRESHOLD) {
            console.log(prediction.class, prediction.probability)
            setPrediction(prediction)
          }
        }
        // grid.updateLandmarks(landmarks, connections, colors);
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
        <div className="player-wraper">
          <div className="container">
            <video className="input_video"></video>
            <canvas className="output_canvas" width="1580px" height="720px"></canvas>
          </div>
          <div className="control-panel"></div>
        </div>
        <div className="player-translation">We think we said: {prediction.class} with {prediction.probability}%</div>
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
