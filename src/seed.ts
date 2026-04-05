import { db } from './firebase';
import { collection, doc, setDoc, addDoc, getDocs, deleteDoc } from 'firebase/firestore';

export const seedDatabase = async () => {
  try {
    // 0. Clear existing data (optional but recommended for a clean seed)
    const collectionsToClear = ['categories', 'menuItems', 'reviews', 'gallery', 'team'];
    for (const coll of collectionsToClear) {
      const snapshot = await getDocs(collection(db, coll));
      for (const docSnap of snapshot.docs) {
        await deleteDoc(doc(db, coll, docSnap.id));
      }
    }

    // 1. Site Settings
    await setDoc(doc(db, 'siteSettings', 'main'), {
      restaurantName: 'Polaris Fast-Food',
      slogan: 'Onde o apetite encontra direção.',
      address: 'Bairro Benfica, Huambo, Angola',
      phone: '+244 923 456 789',
      whatsapp: '+244 923 456 789',
      instagram: '@polaris_huambo',
      email: 'contacto@polaris.com',
      openingHours: 'Seg - Dom: 11:00 - 23:00',
      deliveryFee: 1000.00,
      heroImage: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?q=80&w=2070&auto=format&fit=crop',
      googleMapsUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3923.456789012345!2d15.73456789012345!3d-12.712345678901234!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTLCsDQyJzQ0LjQiUyAxNcKwNDQnMDQuNCJF!5e0!3m2!1spt-PT!2sao!4v1234567890123'
    });

    // 2. Categories
    const categories = [
      { name: 'Hambúrgueres', order: 1 },
      { name: 'Pratos Principais', order: 2 },
      { name: 'Acompanhamentos', order: 3 },
      { name: 'Bebidas', order: 4 },
      { name: 'Sobremesas', order: 5 }
    ];

    const categoryIds: { [key: string]: string } = {};
    for (const cat of categories) {
      const docRef = await addDoc(collection(db, 'categories'), cat);
      categoryIds[cat.name] = docRef.id;
    }

    const commonExtras = [
      { name: 'Maionese', price: 500.00 },
      { name: 'Ketchup', price: 0.00 },
      { name: 'Mostarda', price: 0.00 },
      { name: 'Picante', price: 0.00 },
      { name: 'Queijo Extra', price: 1500.00 },
      { name: 'Bacon Extra', price: 2000.00 },
      { name: 'Ovo', price: 1000.00 }
    ];

    // 3. Menu Items
    const menuItems = [
      // Hambúrgueres
      {
        name: 'Burger Simples',
        description: 'Hambúrguer de carne bovina 120g, queijo, alface e tomate.',
        price: 7500.00,
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1974&auto=format&fit=crop',
        categoryId: categoryIds['Hambúrgueres'],
        isPopular: true,
        extras: commonExtras
      },
      {
        name: 'Burger Duplo',
        description: 'Dois hambúrgueres de 120g, dobro de queijo, alface e tomate.',
        price: 10500.00,
        image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=1965&auto=format&fit=crop',
        categoryId: categoryIds['Hambúrgueres'],
        isPopular: true,
        extras: commonExtras
      },
      // Pratos Principais
      {
        name: 'Cachorro-quente (Hot Dog)',
        description: 'Salsicha premium, pão macio, batata palha, ketchup e mostarda.',
        price: 5000.00,
        image: 'https://images.unsplash.com/photo-1541214113241-21578d2d9b62?q=80&w=2070&auto=format&fit=crop',
        categoryId: categoryIds['Pratos Principais'],
        extras: commonExtras
      },
      {
        name: 'Sanduíche de Frango',
        description: 'Peito de frango grelhado, maionese, alface e tomate no pão de cereais.',
        price: 6500.00,
        image: 'https://images.unsplash.com/photo-1521390188846-e2a3a97453a0?q=80&w=2070&auto=format&fit=crop',
        categoryId: categoryIds['Pratos Principais'],
        extras: commonExtras
      },
      {
        name: 'Sanduíche de Carne',
        description: 'Tiras de carne bovina, queijo derretido e cebola grelhada.',
        price: 7500.00,
        image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?q=80&w=2073&auto=format&fit=crop',
        categoryId: categoryIds['Pratos Principais'],
        extras: commonExtras
      },
      {
        name: 'Sanduíche de Ovo',
        description: 'Ovo estrelado, queijo e bacon no pão brioche.',
        price: 5500.00,
        image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?q=80&w=2080&auto=format&fit=crop',
        categoryId: categoryIds['Pratos Principais'],
        extras: commonExtras
      },
      {
        name: 'Churros',
        description: 'Churros crocantes polvilhados com açúcar e canela, servidos com doce de leite.',
        price: 4000.00,
        image: 'https://images.unsplash.com/photo-1561626423-a51b45aef0a1?q=80&w=2070&auto=format&fit=crop',
        categoryId: categoryIds['Pratos Principais']
      },
      // Acompanhamentos
      {
        name: 'Batata Frita Normal',
        description: 'Porção generosa de batatas fritas crocantes.',
        price: 3500.00,
        image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?q=80&w=1974&auto=format&fit=crop',
        categoryId: categoryIds['Acompanhamentos']
      },
      {
        name: 'Batata Frita com Queijo',
        description: 'Batatas fritas cobertas com molho de queijo cheddar derretido.',
        price: 5000.00,
        image: 'https://images.unsplash.com/photo-1585109649139-366815a0d713?q=80&w=2070&auto=format&fit=crop',
        categoryId: categoryIds['Acompanhamentos']
      },
      {
        name: 'Batata Rústica',
        description: 'Batatas cortadas à mão com casca, temperadas com alecrim e alho.',
        price: 4500.00,
        image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?q=80&w=1974&auto=format&fit=crop',
        categoryId: categoryIds['Acompanhamentos'],
        isPopular: true
      },
      // Bebidas
      {
        name: 'Refrigerante',
        description: 'Lata 330ml (Coca-Cola, Sumol, Fanta).',
        price: 2000.00,
        image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?q=80&w=2070&auto=format&fit=crop',
        categoryId: categoryIds['Bebidas']
      },
      {
        name: 'Sumo Natural',
        description: 'Sumo de laranja espremido na hora.',
        price: 3500.00,
        image: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?q=80&w=1974&auto=format&fit=crop',
        categoryId: categoryIds['Bebidas']
      },
      {
        name: 'Água Normal',
        description: 'Garrafa 500ml.',
        price: 1000.00,
        image: 'https://images.unsplash.com/photo-1523362628744-0c14a394dbb1?q=80&w=2071&auto=format&fit=crop',
        categoryId: categoryIds['Bebidas']
      },
      {
        name: 'Água Mineral',
        description: 'Água com gás 250ml.',
        price: 1500.00,
        image: 'https://images.unsplash.com/photo-1559839914-17aae19cea0e?q=80&w=1974&auto=format&fit=crop',
        categoryId: categoryIds['Bebidas']
      },
      {
        name: 'Milkshake',
        description: 'Gelado batido com leite e topping (Chocolate, Morango ou Baunilha).',
        price: 5500.00,
        image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?q=80&w=1974&auto=format&fit=crop',
        categoryId: categoryIds['Bebidas'],
        isPopular: true
      },
      {
        name: 'Sumo em Garrafa',
        description: 'Compal ou similar (Pêssego, Pêra, Manga).',
        price: 2500.00,
        image: 'https://images.unsplash.com/photo-1600271886332-699bb2798bda?q=80&w=1974&auto=format&fit=crop',
        categoryId: categoryIds['Bebidas']
      },
      // Sobremesas
      {
        name: 'Gelado (Sorvete)',
        description: 'Duas bolas de gelado artesanal à escolha.',
        price: 4500.00,
        image: 'https://images.unsplash.com/photo-1501443762994-82bd5dabb892?q=80&w=2070&auto=format&fit=crop',
        categoryId: categoryIds['Sobremesas']
      },
      {
        name: 'Bolo Simples',
        description: 'Fatia de bolo caseiro (Laranja ou Chocolate).',
        price: 3000.00,
        image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?q=80&w=2089&auto=format&fit=crop',
        categoryId: categoryIds['Sobremesas']
      }
    ];

    for (const item of menuItems) {
      await addDoc(collection(db, 'menuItems'), item);
    }

    // 4. Reviews
    const reviews = [
      { userName: 'João Silva', comment: 'O melhor hambúrguer da cidade! Chegou super rápido e quentinho.', rating: 5, date: new Date().toISOString(), isApproved: true },
      { userName: 'Maria Santos', comment: 'As batatas rústicas são divinais. Recomendo vivamente.', rating: 5, date: new Date().toISOString(), isApproved: true },
      { userName: 'Pedro Oliveira', comment: 'Muito bom, mas a taxa de entrega podia ser mais baixa.', rating: 4, date: new Date().toISOString(), isApproved: true }
    ];

    for (const review of reviews) {
      await addDoc(collection(db, 'reviews'), review);
    }

    // 5. Gallery
    const gallery = [
      { url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=2070&auto=format&fit=crop', title: 'Nossas Pizzas', category: 'Comida', order: 1 },
      { url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1974&auto=format&fit=crop', title: 'Hambúrgueres Premium', category: 'Comida', order: 2 },
      { url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=1965&auto=format&fit=crop', title: 'Ambiente Moderno', category: 'Restaurante', order: 3 },
      { url: 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?q=80&w=2069&auto=format&fit=crop', title: 'Ingredientes Frescos', category: 'Cozinha', order: 4 },
      { url: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?q=80&w=2072&auto=format&fit=crop', title: 'Nossa Equipa', category: 'Equipa', order: 5 },
      { url: 'https://images.unsplash.com/photo-1534353436294-0dbd4bdac845?q=80&w=1974&auto=format&fit=crop', title: 'Bebidas Geladas', category: 'Bebidas', order: 6 },
      { url: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?q=80&w=2032&auto=format&fit=crop', title: 'Sobremesas Deliciosas', category: 'Sobremesas', order: 7 },
      { url: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?q=80&w=2071&auto=format&fit=crop', title: 'O Melhor Atendimento', category: 'Restaurante', order: 8 },
    ];

    for (const img of gallery) {
      await addDoc(collection(db, 'gallery'), img);
    }

    // 6. Team
    const team = [
      { name: 'Ricardo Silva', role: 'Chef Principal', image: 'https://images.unsplash.com/photo-1583394293214-28dea15ee548?q=80&w=1974&auto=format&fit=crop', order: 1 },
      { name: 'Ana Costa', role: 'Gerente de Operações', image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1976&auto=format&fit=crop', order: 2 },
      { name: 'Miguel Santos', role: 'Especialista em Grelhados', image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=1974&auto=format&fit=crop', order: 3 },
      { name: 'Sofia Oliveira', role: 'Pastry Chef', image: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?q=80&w=2070&auto=format&fit=crop', order: 4 },
    ];

    for (const member of team) {
      await addDoc(collection(db, 'team'), member);
    }

    // 7. About Content
    await setDoc(doc(db, 'siteSettings', 'about'), {
      heroImage: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?q=80&w=2070&auto=format&fit=crop',
      storyTitle: 'Nossa História',
      storySubtitle: 'Polaris: Onde o apetite encontra direção.',
      storyText1: 'Polaris nasceu da ideia de algo simples, mas poderoso: ser o ponto de referência no meio de tantas escolhas. Assim como a Estrela Polaris guia viajantes durante a noite, o teu fast-food nasceu com a missão de guiar pessoas até ao verdadeiro sabor.',
      storyText2: 'Em um mundo cheio de opções rápidas e comuns, a Polaris representa qualidade que não se perde, sabor que marca e uma experiência que fica na memória. No Huambo, a Polaris não é apenas um lugar para comer — é o ponto onde o apetite encontra direção. Cada hambúrguer é preparado com o objetivo de ser mais do que comida: é uma experiência que "orienta" o cliente de volta.',
      storyImage: 'https://images.unsplash.com/photo-1577214495773-51465d5061df?q=80&w=1974&auto=format&fit=crop',
      quote: '"Onde o apetite encontra direção."',
      quoteAuthor: 'Polaris Team'
    });

    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
};
