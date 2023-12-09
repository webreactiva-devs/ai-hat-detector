import {
  pipeline,
  env,
} from "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.6.0";

// Since we will download the model from the Hugging Face Hub, we can skip the local model check
env.allowLocalModels = false;

const HAT_SCORE = 0.8;
const CLASSIFIER_CONCEPTS = ["head", "hands", "hat"];

// Reference the elements that we will need
const status = document.getElementById("status");
const messageElement = document.getElementById("message");
const webcamContainer = document.getElementById("webcam-container");
const webcamStarter = document.getElementById("start-webcam");

// Create a new object detection pipeline
status.textContent = "Cargando modelo (tarda un poco)";
messageElement.textContent = "Un momentito...";
// const detector = await pipeline("object-detection", "Xenova/detr-resnet-50");
let classifier;

async function initializeApp() {
  try {
    classifier = await pipeline(
      "zero-shot-image-classification",
      "Xenova/clip-vit-base-patch32"
    );

    console.log("webcam-container");
    status.textContent = "";
    webcamStarter.style.display = "block";

    // Una vez que el clasificador está cargado, inicia el procesamiento de la webcam
    //initWebcam();
  } catch (error) {
    console.error("Error al cargar el clasificador:", error);
  }
}

function initWebcam() {
  webcamContainer.style.display = "flex";
  webcamStarter.style.display = "none";
  const webcamElement = document.getElementById("webcam");
  const canvasElement = document.getElementById("canvas");
  const context = canvasElement.getContext("2d");

  // Configurar la webcam
  if (navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then(function (stream) {
        webcamElement.srcObject = stream;
        webcamElement.onloadedmetadata = function () {
          processWebcam();
        };
      })
      .catch(function (error) {
        console.error("Acceso a la webcam denegado o no disponible", error);
      });
  } else {
    console.log("getUserMedia no es soportado en este navegador.");
  }

  // Función para procesar la imagen en tiempo real
  async function processWebcam() {
    if (webcamElement.readyState === webcamElement.HAVE_ENOUGH_DATA) {
      // Ajusta el tamaño del canvas para que coincida con el video
      canvasElement.width = webcamElement.videoWidth;
      canvasElement.height = webcamElement.videoHeight;

      // Dibuja el frame actual del video en el canvas
      context.drawImage(
        webcamElement,
        0,
        0,
        webcamElement.videoWidth,
        webcamElement.videoHeight
      );

      // Llama a la función detect (aquí llamada classificator) con el frame actual
      await classificator(canvasElement);

      // Continúa procesando el siguiente frame
      requestAnimationFrame(processWebcam);
    }
  }
}

document.addEventListener("DOMContentLoaded", initializeApp);

// Detect objects in the image
async function classificator(img) {
  status.textContent = "Analizando imagen...";
  const output = await classifier(img.toDataURL(), CLASSIFIER_CONCEPTS);
  status.textContent = "";
  console.log(output);
  showDetectorMessage(output);
}

function showDetectorMessage(items) {
  if (isHatScoreHighest(items)) {
    messageElement.textContent = "Puedes pasar 😆";
    messageElement.classList.add("message--green");
    messageElement.classList.remove("message--red");
  } else {
    messageElement.textContent = "¡Ponte sombrero! 🤠";
    messageElement.classList.add("message--red");
    messageElement.classList.remove("message--green");
  }
}

function isHatScoreHighest(items) {
  const hatItem = items.find((item) => item.label === "hat");

  if (!hatItem) {
    // Si no hay un objeto 'hat', devuelve false
    return false;
  }

  if (hatItem.score < HAT_SCORE) {
    return false;
  }

  return items.every(
    (item) => item.label === "hat" || item.score < hatItem.score
  );
}

webcamStarter.addEventListener("click", initWebcam);
