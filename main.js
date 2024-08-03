import './style.css';
import Draw from 'ol/interaction/Draw.js';
import { Map, View } from 'ol';
import { fromLonLat, toLonLat } from 'ol/proj';
import { toStringHDMS } from 'ol/coordinate';
import Feature from 'ol/Feature';
import { Point, Polygon } from 'ol/geom';
import { OSM, Vector as VectorSource } from 'ol/source';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import { getAll, saveData } from './api';
import { Icon, Style } from 'ol/style';
import { jsPanel } from 'jspanel4';
import Overlay from 'ol/Overlay';
import toastr from 'toastr';
import './query.js';
import WKT from 'ol/format/WKT.js';
import Modify from 'ol/interaction/Modify.js';

const format = new WKT();

const raster = new TileLayer({
  source: new OSM(),
});

const view = new View({
  center: fromLonLat([35, 39]),
  zoom: 6.7,
});

export const source = new VectorSource();

const vector = new VectorLayer({
  source: source,
});

const map = new Map({
  layers: [raster, vector],
  target: 'map',
  view: view,
});

const overlay = new Overlay({
  element: document.getElementById('popup'),
  positioning: 'bottom-center',
  stopEvent: false,
  offset: [0, -50]
});

if (!overlay.getElement()) {
  console.error('Popup element not found!');
}

map.addOverlay(overlay);

map.on('pointermove', function (evt) {
  const feature = map.forEachFeatureAtPixel(evt.pixel, function (feature) {
    return feature;
  });

  const popupElement = overlay.getElement();
  if (feature) {
    const coordinates = feature.getGeometry().getCoordinates();
    const hdms = toStringHDMS(toLonLat(coordinates));
    const featureName = feature.get('name') || 'No Name';

    popupElement.innerHTML = `<div>Coordinates: ${hdms}</div><div>Name: ${featureName}</div>`;
    overlay.setPosition(coordinates);
    popupElement.style.display = 'block';
  } else {
    popupElement.style.display = 'none';
  }
});

function loadPoints() {
  getAll()
    .then((data) => {
      if (data && data.responseData) {
        data.responseData.forEach((element) => {
          console.log(element);

          const format = new WKT();
          const feature = format.readFeature(element.wkt, {});

          feature.set("id", element.id)

           if(element.wkt.includes("POINT")){
            const pointStyle = new Style({
              image: new Icon({
                anchor: [0.5, 46],
                anchorXUnits: 'fraction',
                anchorYUnits: 'pixels',
                src: 'img/pin.png',
                width: 30,
                height: 40,
              }),
            });
            feature.setStyle(pointStyle);
            
           }

          source.addFeature(feature);
        });
      } else {
        console.error('Invalid data structure:', data);
      }
    })
    .catch((error) => {
      console.error('Error in getAll:', error);
    });
}

loadPoints();

let draw;
let modify;
let modifiedFeatures = new Set();

export function addDrawInteraction(type) {
  if (draw) {
    map.removeInteraction(draw);
  }
  draw = new Draw({
    source: source,
    type: type,
  });

  map.addInteraction(draw);

  draw.on('drawend', function (event) {
    const wkt = format.writeFeature(event.feature);
    showPanel(wkt, type);
  });
}

export function addModifyInteraction() {
  if (modify) {
    map.removeInteraction(modify);
  }
  modify = new Modify({ source: source });
  map.addInteraction(modify);

  modify.on('modifyend', function (event) {
    event.features.forEach(function (feature) {
      modifiedFeatures.add(feature);
    });

    map.once('singleclick', function () {
      const wktStrings = Array.from(modifiedFeatures).map(feature => format.writeFeature(feature));
      showPanel(wktStrings.join('\n'));
      modifiedFeatures.clear();
      });
    });
    modifiedFeatures.forEach(function (feature) {
      source.removeFeature(feature);
  });
}

//const coordinates = event.feature.getGeometry().getCoordinates();

function showPanel(wkt, type) {
  const wktPanel = jsPanel.create({
    headerTitle: 'Add ' + type,
    content: `
      <form id="coordinateForm">
        <label for="coordinates">Coordinates (WKT):</label>
        <textarea id="coordinates" name="coordinates" rows="4" cols="50" readonly>${wkt}</textarea>
        <br>
        <label for="name">Name:</label>
        <input type="text" id="name" name="name" required>
        <br>
        <button type="submit">Submit</button>
      </form>
    `,
    callback: (panel) => {
      const form = panel.querySelector('#coordinateForm');
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const name = form.name.value;

        const polygon = { wkt, name };

        try {
          const result = await saveData(polygon);
          console.log('Data saved:', result);
          toastr.success('Data saved successfully!');

          const feature = format.readFeature(wkt, {
            dataProjection: 'EPSG:4326',
            featureProjection: 'EPSG:3857',
          });

          const vectorSource = new VectorSource({
            features: [feature],
          });

          const vectorLayer = new VectorLayer({
            source: vectorSource,
          });

          map.addLayer(vectorLayer);
          wktPanel.close()
        } catch (error) {
          console.error('Error saving data:', error);
          toastr.error('Failed to save data');
        }finally{
          loadPoints()
        }
      });
    }
  });
}

function stopInteraction() {
  if (draw) {
    map.removeInteraction(draw);
    draw = null;
  }
  if (modify) {
    map.removeInteraction(modify);
    modify = null;
  }
}

document.getElementById('draw-point-btn').addEventListener('click', () => {
  addDrawInteraction('Point');
});

document.getElementById('draw-polygon-btn').addEventListener('click', () => {
  addDrawInteraction('Polygon');
});

document.getElementById('stop-draw-btn').addEventListener('click', () => {
  stopInteraction();
});

export { loadPoints, view, map };
