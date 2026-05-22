// ================= OCR（备用） =================
async function ocrImage(file) {
    return new Promise((resolve) => {
        Tesseract.recognize(file, 'eng+chi_sim')
            .then(({ data: { text } }) => resolve(text));
    });
}

// ================= 模拟解析 =================
async function aiAnalysis(text) {

    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer YOUR_API_KEY"
        },
        body: JSON.stringify({
            model: "deepseek-chat",
            messages: [
                {
                    role: "system",
                    content: "你是一个物理老师，用中文+英文双语讲解物理题，包含步骤、公式和知识点"
                },
                {
                    role: "user",
                    content: text
                }
            ]
        })
    });

    const data = await response.json();

    return {
        answer: data.choices[0].message.content
    };
}

// ================= 显示结果 =================
function showResult(data) {
    document.getElementById("type").innerText = data.type;
    document.getElementById("knowledge").innerText = data.knowledge;
    document.getElementById("cn").innerText = data.cn;
    document.getElementById("en").innerText = data.en;
    document.getElementById("history").innerText = data.history;
}

// ================= 错题本 =================
function getNotebook() {
    return JSON.parse(localStorage.getItem("notebook") || "[]");
}

function saveNotebook(data) {
    localStorage.setItem("notebook", JSON.stringify(data));
}

function renderNotebook() {
    const list = document.getElementById("notebookList");
    const data = getNotebook();

    list.innerHTML = "";

    data.forEach(item => {
        const div = document.createElement("div");
        div.className = "card";

        div.innerHTML = `
            <p><b>题目：</b>${item.question}</p>
            <p><b>时间：</b>${item.time}</p>
        `;

        list.appendChild(div);
    });
}

// ================= 页面加载后绑定事件（关键修复） =================
window.onload = function () {

    console.log("JS加载成功");

    // -------- 分析按钮 --------
    document.getElementById("analyzeBtn").onclick = async function () {

        let text = document.getElementById("questionInput").value;
        const file = document.getElementById("imageInput").files[0];

        if (file) {
            text = await ocrImage(file);
        }

        const result = await aiAnalysis(text);
        document.getElementById("cn").innerText = result.answer;
    };

    // -------- 错题本按钮（已修复） --------
    const saveBtn = document.getElementById("saveBtn");

    if (saveBtn) {
        saveBtn.onclick = function () {

            const item = {
                question: document.getElementById("questionInput").value,
                time: new Date().toLocaleString()
            };

            let data = getNotebook();
            data.push(item);
            saveNotebook(data);

            renderNotebook();

            alert("已加入错题本 ⭐");
        };
    }

    renderNotebook();
};