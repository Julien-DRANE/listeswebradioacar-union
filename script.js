function chargerCSV(fichierCSV) {
    Papa.parse(fichierCSV, {
        download: true,
        header: true,
        skipEmptyLines: true,
        delimiter: ";",
        complete: function(results) {
            
            const data = results.data;
            if (!data || data.length === 0) {
                alert("Aucune donnée trouvée dans le CSV.");
                return;
            }

            const tbody = $('#table-etablissements tbody');
            tbody.empty();

            const KEY_UAI = "UAI";
            const KEY_NOM = "Nom de l'établissement";
            const KEY_TYPE = "Type";
            const KEY_COMMUNE = "Commune";
            const KEY_WEB = "Site web";
            const KEY_STATUS = "Statut détection";
            const KEY_INDICE = "Indice trouvé";
            const KEY_URL = "URL de détection";

            const hasDetection = data[0].hasOwnProperty(KEY_STATUS);
            const typesSet = new Set();

            data.forEach(row => {

                const site = row[KEY_WEB]?.startsWith("http")
                    ? `<a href="${row[KEY_WEB]}" target="_blank">🔗</a>`
                    : "";

                let statusText = "-";
                let statusOrder = "4";

                if (hasDetection) {
                    const st = row[KEY_STATUS] || "N/A";
                    const indice = row[KEY_INDICE] || "";
                    const detURL = row[KEY_URL] || "";

                    if (st === "Oui") {
                        statusOrder = "1";
                        statusText = `🎙️ Oui<br><small>${indice}</small>`;
                    } else if (st === "Non") {
                        statusOrder = "2";
                        statusText = `❌ Non`;
                    } else if (st === "Erreur") {
                        statusOrder = "3";
                        statusText = `⚠️ Erreur`;
                    }
                }

                const urlDetected = row[KEY_URL]?.startsWith("http")
                    ? `<a href="${row[KEY_URL]}" target="_blank">Page</a>`
                    : "-";

                const tr = $("<tr>");

                tr.append(`<td>${row[KEY_UAI] || ""}</td>`);
                tr.append(`<td>${row[KEY_NOM] || ""}</td>`);
                tr.append(`<td>${row[KEY_TYPE] || ""}</td>`);
                tr.append(`<td>${row[KEY_COMMUNE] || ""}</td>`);
                tr.append(`<td>${site}</td>`);

                tr.append(
                    $('<td>')
                        .html(statusText)
                        .attr("data-order", statusOrder)
                );

                tr.append(`<td>${row[KEY_INDICE] || "-"}</td>`);
                tr.append(`<td>${urlDetected}</td>`);

                tbody.append(tr);

                if (row[KEY_TYPE]) typesSet.add(row[KEY_TYPE]);
            });

            if ($.fn.DataTable.isDataTable("#table-etablissements")) {
                $('#table-etablissements').DataTable().destroy();
            }

            const table = $('#table-etablissements').DataTable({
                pageLength: 25,
                language: {
                    url: "https://cdn.datatables.net/plug-ins/1.13.4/i18n/fr-FR.json"
                },
                order: [[5, 'asc']]
            });

            $("#filtre-type").html(`<option value="">Tous les types</option>`);
            Array.from(typesSet).sort().forEach(t => {
                $("#filtre-type").append(`<option value="${t}">${t}</option>`);
            });

            $("#filtre-type").off().on("change", function() {
                table.column(2).search($(this).val()).draw();
            });

            $("#filtre-webradio").off().on("change", function() {
                const val = $(this).val();
                if (val === "🎙️") table.column(5).search("Oui").draw();
                else if (val === "❌") table.column(5).search("Non").draw();
                else if (val === "⚠️") table.column(5).search("Erreur").draw();
                else table.column(5).search("").draw();
            });

            $("#export-csv").off().on("click", function() {
                const filtered = table.rows({ search: "applied" }).data().toArray();
                const exportData = filtered.map(r => data.find(x => x[KEY_UAI] === r[0]));

                const csv = Papa.unparse(exportData, { delimiter: ";" });
                const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);

                const a = document.createElement("a");
                a.href = url;
                a.download = "webradios_export_filtre.csv";
                a.click();

                URL.revokeObjectURL(url);
            });
        }
    });
}

$(document).ready(function () {
    chargerCSV($("#csv-selector").val());
    $("#csv-selector").on("change", function () {
        chargerCSV($(this).val());
    });
});
