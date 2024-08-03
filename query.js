import { deleteData, getAll, updateData } from './api.js';
import { jsPanel } from 'jspanel4';
import 'https://cdn.jsdelivr.net/npm/jspanel4@4.12.0/es6module/jspanel.min.js';
import { Point } from 'ol/geom';
import Feature from 'ol/Feature';
import { Icon, Style } from 'ol/style';
import { source, map } from './main.js';
import { Pointer as PointerInteraction } from 'ol/interaction.js';
import toastr from 'toastr';
import 'toastr/build/toastr.min.css';
import { addModifyInteraction } from './main.js';



class Drag extends PointerInteraction {
    constructor() {
        super({
            handleDownEvent: handleDownEvent,
            handleDragEvent: handleDragEvent,
            handleMoveEvent: handleMoveEvent,
            handleUpEvent: handleUpEvent,
        });

        this.coordinate_ = null;
        this.cursor_ = 'pointer';
        this.feature_ = null;
        this.previousCursor_ = undefined;
        this.dragging_ = false;
    }
}

function handleDownEvent(evt) {
    const map = evt.map;

    const feature = map.forEachFeatureAtPixel(evt.pixel, function (feature) {
        return feature;
    });

    if (feature) {
        this.coordinate_ = evt.coordinate;
        this.feature_ = feature;
        this.dragging_ = true;
    }

    return !!feature;
}

function handleDragEvent(evt) {
    const deltaX = evt.coordinate[0] - this.coordinate_[0];
    const deltaY = evt.coordinate[1] - this.coordinate_[1];

    const geometry = this.feature_.getGeometry();
    geometry.translate(deltaX, deltaY);

    this.coordinate_[0] = evt.coordinate[0];
    this.coordinate_[1] = evt.coordinate_[1];
}

function handleMoveEvent(evt) {
    if (this.cursor_) {
        const map = evt.map;
        const feature = map.forEachFeatureAtPixel(evt.pixel, function (feature) {
            return feature;
        });
        const element = evt.map.getTargetElement();
        if (feature) {
            if (element.style.cursor != this.cursor_) {
                this.previousCursor_ = element.style.cursor;
                element.style.cursor = this.cursor_;
            }
        } else if (this.previousCursor_ !== undefined) {
            element.style.cursor = this.previousCursor_;
            this.previousCursor_ = undefined;
        }
    }
}

async function handleUpEvent(evt) {
    if (this.feature_) {
        this.dragging_ = false;
        const coordinates = this.feature_.getGeometry().getCoordinates();
        const name = this.feature_.get('name');
        const id = this.feature_.getId();

        if (id === undefined) {
            console.error('Feature ID is undefined');
            return false;
        }

        try {
            const updatedPoint = {
                id: id,
                wkt: coordinates[0],
                name: name,
            };

            const result = await updateData(updatedPoint);
            console.log('Data updated:', result);
            toastr.success('Data updated successfully!');
        } catch (error) {
            console.error('Error updating data:', error);
            toastr.error('Failed to update data');
        }
    }

    this.coordinate_ = null;
    this.feature_ = null;
    return false;
}


document.getElementById('query-btn').addEventListener('click', () => {
    jsPanel.create({
        headerTitle: 'Query Points',
        position: 'left-top 0 58',
        contentSize: '400 300',
        content: '<div id="queryResults">Loading...</div>',
        callback: async (panel) => {
            try {
                const data = await getAll();
                if (data && data.responseData) {
                    const resultList = data.responseData.map((element, index) => `
            <div class="query-item" data-index="${index}">
              <div class="query-item-header">${element.name}</div>
              <div class="query-item-details">
                <p>wkt: ${element.wkt}</p>
                <button class="show-btn">Göster</button>
                <button class="edit-btn">Manuel Düzenle</button>
                <button class="otoedit-btn">Otomatik Düzenle</button>
                <button class="delete-btn">Sil</button>
              </div>
            </div>
          `).join('');
                    panel.content.innerHTML = `
            <div id="queryResults">${resultList}</div>
            <div id="coordinatesPanel"></div>
          `;

                    const items = panel.content.querySelectorAll('.query-item');
                    items.forEach((item, index) => {
                        item.addEventListener('click', () => {
                            const polygon = data.responseData[index];
                            const coordinatesPanel = panel.content.querySelector('#coordinatesPanel');
                            coordinatesPanel.innerHTML = `
                <h3>Details for ${polygon.name}</h3>
                <p>wkt: ${polygon.wkt}</p>
              `;
                        });

                        // var test = WKT.loads(polygon.wkt);

                        item.querySelector('.show-btn').addEventListener('click', (event) => {
                            const polygon = data.responseData[index];

                            const feature = source.getFeatures().find(f => f.get('id') === polygon.id);
                            if (feature) {

                                const geometry = feature.getGeometry();
                                const extent = geometry.getExtent();
                                map.getView().fit(extent, {
                                    padding: [20, 20, 20, 20],
                                    duration: 500,
                                    maxZoom: 14
                                });
                                // showPopupForFeature(feature);
                                // closeCoordinatesModal();
                            }
                            // event.stopPropagation();
                        });


                        item.querySelector('.otoedit-btn').addEventListener('click', (event) => {
                            const polygon = data.responseData[index];
                            event.stopPropagation();
                            addModifyInteraction(polygon);
                        });

                        /*item.querySelector('.otoedit-btn').addEventListener('click', (event) => {
                            event.stopPropagation();
                            const polygon = data.responseData[index];
              
                            const iconFeature = source.getFeatures().find(feature => feature.get('name') === polygon.name);
                            if (iconFeature) {
                              iconFeature.setId(polygon.id);
              
                              const dragInteraction = new Drag();
                              map.addInteraction(dragInteraction);
              
                              item.querySelector('.otoedit-btn').addEventListener('click', (event) => {
                                event.stopPropagation();
                                map.removeInteraction(dragInteraction);
                              }, { once: true });
                            }
                          });*/


                        item.querySelector('.edit-btn').addEventListener('click', (event) => {
                            event.stopPropagation();
                            const polygon = data.responseData[index];
                            jsPanel.create({
                                headerTitle: 'Edit Point',
                                content: `
                                <form id="editForm">
                                  <label for="editwkt">wkt:</label>
                                  <input type="number" id="editwkt" name="editwkt" value="${polygon.wkt}" required>
                                  <br>
                                  <label for="editName">Name:</label>
                                  <input type="text" id="editName" name="editName" value="${polygon.name}" required>
                                  <br>
                                  <button type="submit">Save</button>
                                </form>
                              `,
                                callback: (panel) => {
                                    const form = panel.querySelector('#editForm');
                                    form.addEventListener('submit', async (event) => {
                                        event.preventDefault();
                                        const wkt = parseFloat(form.editwkt.value);
                                        const name = form.editName.value;

                                        const updatedPoint = { id: polygon.id, wkt, name };

                                        try {
                                            const result = await updateData(updatedPoint);
                                            console.log('Data updated:', result);
                                            toastr.success('Data updated successfully!');

                                            const iconFeature = new Feature({
                                                geometry: new Point([wkt]),
                                                name: name,
                                            });

                                            const iconStyle = new Style({
                                                image: new Icon({
                                                    anchor: [0.5, 46],
                                                    anchorXUnits: 'fraction',
                                                    anchorYUnits: 'pixels',
                                                    src: 'img/pin.png',
                                                    width: 30,
                                                    height: 40,
                                                }),
                                            });

                                            iconFeature.setStyle(iconStyle);
                                            source.addFeature(iconFeature);

                                            // Eski noktayı kaldırmak için kodun bu kısmını kulancam
                                            const features = source.getFeatures();
                                            const oldFeature = features.find(feature => feature.get('name') === polygon.name);
                                            if (oldFeature) {
                                                source.removeFeature(oldFeature);
                                            }

                                        } catch (error) {
                                            console.error('Error updating data:', error);
                                            toastr.error('Failed to update data');
                                        }

                                        window.location.reload();

                                    });
                                }
                            });
                        });

                        item.querySelector('.delete-btn').addEventListener('click', async (event) => {
                            event.stopPropagation();
                            const polygon = data.responseData[index];
                            try {
                                await deleteData(polygon?.id);
                                toastr.success('Data deleted successfully!');
                                window.location.reload();
                            } catch (error) {
                                console.error('Error deleting data:', error);
                                toastr.error('Failed to delete data');
                            }
                        });
                    });

                } else {
                    panel.content.innerHTML = 'No data found';
                }
            } catch (error) {
                console.error('Error fetching query data:', error);
                panel.content.innerHTML = 'Error loading data';
            }
        }
    });
});
