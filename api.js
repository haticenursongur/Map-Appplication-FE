export async function getAll() {
  try {
    const response = await fetch('https://localhost:7021/api/MapApi1/getall');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
}

export async function saveData(point) {
  try {
    const response = await fetch('https://localhost:7021/api/MapApi1/SavePoint', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(point),
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error saving data:', error);
    throw error;
  }
}

export async function deleteData(id) {
  try {
    const response = await fetch('https://localhost:7021/api/MapApi1/DeletePoint/'+ id, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error saving data:', error);
    throw error;
  }
}

export async function updateData(point) {
  try {
    const response = await fetch('https://localhost:7021/api/MapApi1/UpdatePoint', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(point),
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error update data:', error);
    throw error;
  }
}