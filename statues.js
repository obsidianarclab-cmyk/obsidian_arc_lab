const products = {
  ganesha: {
    name: "Mini Ganesha",
    desc: "A detailed Ganesha statue created for prayer spaces, meaningful gifts and refined spiritual décor.",
    colours: {
      White: {
        size: "Available in custom sizes",
        material: "White PLA",
        weight: "Varies by selected size",
        images: [{ label: "Front", src: "image/Mini_Ganesha/Mini_Ganesha_White-Front.jpg" }]
      },
      Gold: {
        size: "Available in custom sizes",
        material: "Gold Silk PLA",
        weight: "Varies by selected size",
        images: [{ label: "Front", src: "image/Mini_Ganesha/Mini_Ganesha_Gold-Front.jpg" }]
      },
      Black: {
        size: "Available in custom sizes",
        material: "Black PLA",
        weight: "Varies by selected size",
        images: [{ label: "Front", src: "image/Mini_Ganesha/Mini_Ganesha_Black-Front.jpg" }]
      }
    }
  },
  anjaneya: {
    name: "Mini Anjaneya",
    desc: "A detailed Anjaneya statue suitable for spiritual décor, gifting and custom-colour printing.",
    colours: {
      White: {
        size: "Small: 5 × 7 × 8 cm · Medium: 10 × 12 × 13 cm",
        material: "White PLA",
        weight: "Varies by selected size",
        images: [
          { label: "Front", src: "image/hanuman/Hanuman_White-Front.jpeg" },
          { label: "Left side", src: "image/hanuman/Hanuman_White-Side1.jpeg" },
          { label: "Right side", src: "image/hanuman/Hanuman_White-Side2.jpeg" },
          { label: "Back", src: "image/hanuman/Hanuman_White-Back.jpeg" }
        ]
      }
    }
  },
  buddha: {
    name: "Mini Buddha",
    desc: "A peaceful Buddha statue for meditation spaces, home décor and thoughtful gifting.",
    colours: {
      "Gold + White": {
        size: "Small: 5 × 7 × 8 cm · Medium: 10 × 12 × 13 cm · Large: 15 × 17 × 19 cm",
        material: "Gold and White PLA",
        weight: "Varies by selected size",
        images: [{ label: "Main", src: "image/Buddha/Buddha_Gold+White-Main.jpg" }]
      }
    }
  }
};

let currentProduct = null;
let currentFinish = null;

function openWithKeyboard(event, productKey) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    openProduct(productKey);
  }
}

function openProduct(productKey) {
  currentProduct = products[productKey];
  if (!currentProduct) return;

  document.getElementById("productName").textContent = currentProduct.name;
  document.getElementById("productDesc").textContent = currentProduct.desc;

  const finishes = Object.keys(currentProduct.colours);
  const select = document.getElementById("colourSelect");
  select.innerHTML = finishes.map(finish => `<option value="${finish}">${finish}</option>`).join("");
  currentFinish = finishes[0];
  updateProductDetails();

  document.getElementById("productModal").classList.add("is-open");
  document.body.style.overflow = "hidden";
  document.querySelector(".statue-modal__close").focus();
}

function changeColour() {
  currentFinish = document.getElementById("colourSelect").value;
  updateProductDetails();
}

function updateProductDetails() {
  const data = currentProduct?.colours[currentFinish];
  if (!data) return;

  document.getElementById("productSize").textContent = data.size;
  document.getElementById("productMaterial").textContent = data.material;
  document.getElementById("productWeight").textContent = data.weight;

  const row = document.getElementById("angleRow");
  row.innerHTML = data.images.map((image, index) => `
    <button type="button" class="${index === 0 ? "is-active" : ""}" onclick="changeAngle(${index})" aria-label="Show ${image.label} view">
      <img src="${image.src}" alt="${currentProduct.name} ${image.label.toLowerCase()} view">
    </button>
  `).join("");

  changeAngle(0);
}

function changeAngle(index) {
  const data = currentProduct?.colours[currentFinish];
  const image = data?.images[index];
  if (!image) return;

  const mainImage = document.getElementById("mainImg");
  mainImage.src = image.src;
  mainImage.alt = `${currentProduct.name} ${image.label.toLowerCase()} view`;
  document.getElementById("viewLabel").textContent = `${image.label.toUpperCase()} VIEW`;

  document.querySelectorAll("#angleRow button").forEach((button, buttonIndex) => {
    button.classList.toggle("is-active", buttonIndex === index);
  });
}

function closeProduct() {
  document.getElementById("productModal").classList.remove("is-open");
  document.body.style.overflow = "";
}

function closeOnBackdrop(event) {
  if (event.target.id === "productModal") closeProduct();
}

function askWhatsapp() {
  if (!currentProduct || !currentFinish) return;
  const message = `Hello Obsidian Arc Lab, I would like to enquire about ${currentProduct.name} in ${currentFinish}. Please share the price and customisation details.`;
  window.open(`https://wa.me/60103738630?text=${encodeURIComponent(message)}`, "_blank", "noopener");
}

document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeProduct();
});
