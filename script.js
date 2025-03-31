const video = document.getElementById("video");

Promise.all([
  faceapi.nets.ssdMobilenetv1.loadFromUri("/models"),
  faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
  faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
]).then(() => {
  console.log("✅ Models loaded successfully");
  startWebcam();
});

function startWebcam() {
  navigator.mediaDevices
    .getUserMedia({ video: true, audio: false })
    .then((stream) => {
      document.getElementById("video").srcObject = stream;
      console.log("✅ Webcam is working");
    })
    .catch((err) => {
      console.error("❌ Webcam error:", err);
    });
}

async function getLabeledFaceDescriptions() {
  const labels = ["Christano", "Dawit", "Messi"];

  return Promise.all(
    labels.map(async (label) => {
      const descriptions = [];

      for (let i = 1; i <= 2; i++) {
        try {
          const img = await faceapi.fetchImage(`./labels/${label}/${i}.png`);
          const detection = await faceapi
            .detectSingleFace(img)
            .withFaceLandmarks()
            .withFaceDescriptor();

          if (detection) {
            descriptions.push(detection.descriptor);
          } else {
            console.warn(`⚠️ No face detected in ${label}/${i}.png`);
          }
        } catch (error) {
          console.error(`❌ Error loading ${label}/${i}.png:`, error);
        }
      }

      return new faceapi.LabeledFaceDescriptors(label, descriptions);
    })
  );
}

document.getElementById("video").addEventListener("play", async () => {
  console.log("🎥 Video is playing...");

  const labeledFaceDescriptors = await getLabeledFaceDescriptions();
  const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors);

  const canvas = faceapi.createCanvasFromMedia(
    document.getElementById("video")
  );
  document.body.append(canvas);

  const displaySize = {
    width: document.getElementById("video").width,
    height: document.getElementById("video").height,
  };
  faceapi.matchDimensions(canvas, displaySize);

  setInterval(async () => {
    const detections = await faceapi
      .detectAllFaces(document.getElementById("video"))
      .withFaceLandmarks()
      .withFaceDescriptors();

    console.log(" Detections:", detections);

    if (detections.length === 0) {
      console.warn("⚠️ No faces detected!");
      return;
    }

    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

    resizedDetections.forEach((detection, i) => {
      const box = detection.detection.box;
      const bestMatch = faceMatcher.findBestMatch(detection.descriptor);

      const drawBox = new faceapi.draw.DrawBox(box, {
        label: bestMatch.toString(),
      });
      drawBox.draw(canvas);
    });
  }, 100);
});
