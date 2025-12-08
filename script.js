function chargerCSV(fichierCSV) {
  Papa.parse(fichierCSV, {
    download: true,
    header: true,
    skipEmptyLines: true,
    delimiter: ";",
    complete: function (results) {
      const data = results.data;
      if (!data || data.length === 0) {
        alert("Aucune donnée chargée.");
        return;
      }

      const tbody = $('#table-etablissements tbody');
      tbody.empty();
      const typesSet = new Set();

      const hasWebradioData = data[0] && data[0].hasOwnProperty("Webradio détectée");
      $('#filtre-webradio-container').toggle(hasWebradioData);

      data.forEach(row => {
        const site = row["Web"] && row["Web"].startsWith("http")
          ? `<a href="${row["Web"]}" target="_blank">🔗 Site</a>`
          : "";

        let webradioContent = "";
        let webradioSortValue = "";

        if (hasWebradioData) {
          const status = row["Webradio détectée"] || "";
          const indice = row["Indice trouvé"] || "";
          const urlDetection = row["URL de détection"] || "";

          if (status === "Oui") {
            webradioSortValue = "1";
            const lien = urlDetection
              ? `<a href="${urlDetection}" target="_blank" class="webradio-link" title="${indice}">🎙️ Oui</a>`
              : `<span title="${indice}">🎙️ Oui</span>`;
            webradioContent = `${lien}<br><small style="color:#666">${indice}</small>`;
          } else if (status === "Erreur") {
            webradioSortValue = "3";
            webradioContent = `⚠️ Erreur`;
          } else if (status === "Non renseigné") {
            webradioSortValue = "4";
            webradioContent = `-`;
          } else {
            webradioSortValue = "2";
            webradioContent = `❌ Non`;
          }
        } else {
          webradioContent = row["Projet webradio"] || "";
          webradioSortValue = "";
        }

        const tr = $('<tr>');
        tr.append(`<td>${row["Identifiant_de_l_etablissement"] || ""}</td>`);
        tr.append(`<td>${row["Nom_etablissement"] || ""}</td>`);
        tr.append(`<td>${row["libelle_nature"] || ""}</td>`);
        tr.append(`<td>${row["Nom_commune"] || ""}</td>`);
        tr.append(`<td>${site}</td>`);

        const webradioCell = $('<td>').html(webradioContent);
        if (hasWebradioData) {
          webradioCell.attr('data-order', webradioSortValue);
          const status = row["Webradio détectée"] || "";
          webradioCell.addClass(
            status === "Oui" ? 'webradio-oui' :
            status === "Erreur" ? 'webradio-erreur' :
            status === "Non" ? 'webradio-non' : ''
          );
        } else {
          webradioCell.attr('contenteditable', 'true');
        }
        tr.append(webradioCell);

        tr.append(`<td contenteditable="true">${row["Statut projet"] || ""}</td>`);
        tr.append(`<td contenteditable="true">${row["Référent"] || ""}</td>`);
        tr.append(`<td contenteditable="true">${row["Canal diffusion"] || ""}</td>`);
        tr.append(`<td contenteditable="true">${row["Remarques"] || ""}</td>`);

        tbody.append(tr);

        if (row["libelle_nature"]) typesSet.add(row["libelle_nature"]);
      });

      $('#table-etablissements thead tr th').eq(5).html(hasWebradioData ? '🎙️ Webradio détectée' : 'Projet webradio');

      if ($.fn.DataTable.isDataTable("#table-etablissements")) {
        $('#table-etablissements').DataTable().destroy();
      }

      const table = $('#table-etablissements').DataTable({
        pageLength: 25,
        language: {
          url: "https://cdn.datatables.net/plug-ins/1.13.4/i18n/fr-FR.json"
        },
        order: hasWebradioData ? [[5, 'desc']] : [[1, 'asc']]
      });

      $('#filtre-type').empty().append(`<option value="">Tous les types</option>`);
      Array.from(typesSet).sort().forEach(type => {
        $('#filtre-type').append(`<option value="${type}">${type}</option>`);
      });

      $('#filtre-type').off('change').on('change', function () {
        table.column(2).search($(this).val()).draw();
      });

      $('#filtre-webradio').off('change').on('change', function () {
        table.column(5).search($(this).val()).draw();
      });

      $('#export-csv').off('click').on('click', function () {
        const editedData = [];
        $('#table-etablissements tbody tr').each(function () {
          const tds = $(this).find('td');
          editedData.push({
            "UAI": tds.eq(0).text(),
            "Nom de l'établissement": tds.eq(1).text(),
            "Type": tds.eq(2).text(),
            "Commune": tds.eq(3).text(),
            "Site web": tds.eq(4).find("a").attr("href") || "",
            "Projet webradio": tds.eq(5).text().replace(/\n/g, ' ').trim(),
            "Statut projet": tds.eq(6).text(),
            "Référent": tds.eq(7).text(),
            "Canal diffusion": tds.eq(8).text(),
            "Remarques": tds.eq(9).text()
          });
        });

        const csv = Papa.unparse(editedData, { delimiter: ";" });
        const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'etablissements-modifies.csv';
        a.click();
        URL.revokeObjectURL(url);
      });

      // Résumé Webradio
      if (hasWebradioData) {
        const webradiosOui = data.filter(r => r["Webradio détectée"] === "Oui").length;
        const erreurCount = data.filter(r => r["Webradio détectée"] === "Erreur").length;
        const nonCount = data.filter(r => r["Webradio détectée"] === "Non").length;

        const summaryHTML = `
          <div id="webradio-summary">
            <strong>📊 Résumé de la détection automatique</strong>
            <div class="stats">
              <div class="stat-item">
                <div class="stat-number">${webradiosOui}</div>
                <div>🎙️ Webradios détectées</div>
              </div>
              <div class="stat-item">
                <div class="stat-number" style="color:#dc3545">${nonCount}</div>
                <div>❌ Sans webradio</div>
              </div>
              ${erreurCount > 0 ? `
              <div class="stat-item">
                <div class="stat-number" style="color:#ffc107">${erreurCount}</div>
                <div>⚠️ Erreurs</div>
              </div>` : ''}
              <div class="stat-item">
                <div class="stat-number" style="color:#6c757d">${data.length}</div>
                <div>📍 Total établissements</div>
              </div>
            </div>
          </div>`;

        $('#webradio-summary-container').html(summaryHTML);
      } else {
        $('#webradio-summary-container').empty();
      }
    },
    error: function (error) {
      alert("Erreur lors du chargement du fichier CSV : " + error.message);
    }
  });
}

$(document).ready(function () {
  const initialCSV = $('#csv-selector').val();
  chargerCSV(initialCSV);
  $('#csv-selector').on('change', function () {
    chargerCSV($(this).val());
  });
});